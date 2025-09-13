# main.py
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from auth import get_current_user
import git
import tempfile 
import shutil
import os
from parser import parse_code_file

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

class ProjectCreate(BaseModel):
    github_url: str
class ProjectUpdate(BaseModel):
    name: str
class UserProfile(BaseModel):
    displayName: str
    bio: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Must match your frontend URL
    allow_credentials=True,
    allow_methods=["*"], # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"], # Allows headers like 'Authorization'
)

@app.get("/")
def read_root():
    return {"message": "CodeSage Backend is running!"}

@app.get("/api/me")
def read_current_user(user: dict = Depends(get_current_user)):
    return {"uid": user.get("uid"), "email": user.get("email")}

@app.get("/api/profile")
def get_profile(user: dict = Depends(get_current_user)):
    """
    Fetch the current user's profile.
    """
    uid = user.get("uid")
    profile_ref = db.collection("profiles").document(uid)
    profile_doc = profile_ref.get()

    if profile_doc.exists:
        return profile_doc.to_dict()
    else:
        return {"displayName": "", "bio": ""}  # Default if profile doesn't exist

@app.post("/api/profile")
def update_profile(profile: UserProfile, user: dict = Depends(get_current_user)):
    """
    Create or update the current user's profile.
    """
    uid = user.get("uid")
    profile_ref = db.collection("profiles").document(uid)

    profile_data = {
        "displayName": profile.displayName,
        "bio": profile.bio,
        "updated_at": datetime.utcnow()
    }

    profile_ref.set(profile_data, merge=True)  # merge=True means update if exists
    return {"message": "Profile updated successfully!"}

@app.post("/api/projects")
def create_project(project_data: ProjectCreate, user: dict = Depends(get_current_user)):
    owner_uid = user.get("uid")
    project_name = project_data.github_url.split("/")[-1]
    new_project = {
        "name": project_name,
        "github_url": project_data.github_url,
        "owner_uid": owner_uid,
        "status": "created",
        "created_at": datetime.utcnow(),
        "settings": {}
    }
    projects_collection = db.collection('projects')
    update_time, project_ref = projects_collection.add(new_project)
    return {"id": project_ref.id, "message": f"Project '{project_name}' created successfully."}

@app.get("/api/projects")
def get_projects(user: dict = Depends(get_current_user)):
    owner_uid = user.get("uid")
    projects_collection = db.collection('projects')
    from google.cloud.firestore_v1.base_query import FieldFilter

    user_projects_query = projects_collection.where(filter=FieldFilter('owner_uid', '==', owner_uid))
    projects = []
    for doc in user_projects_query.stream():
        project_data = doc.to_dict()
        project_data['id'] = doc.id
        project_data['created_at'] = project_data['created_at'].isoformat()
        projects.append(project_data)
    return projects

@app.put("/api/projects/{project_id}")
def update_project(project_id: str, project_data: ProjectUpdate, user: dict = Depends(get_current_user)):
    """
    Protected endpoint to update a project's name.
    """
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_doc.to_dict().get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized to update this project")

    project_ref.update({"name": project_data.name})
    return {"message": "Project updated successfully"}

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: str, user: dict = Depends(get_current_user)):
    """
    Protected endpoint to delete a project.
    """
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_doc.to_dict().get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")

    project_ref.delete()
    return {"message": "Project deleted successfully"}

@app.post("/api/projects/{project_id}/analyze")
def analyze_project(project_id: str, user: dict = Depends(get_current_user)):
    """
    Protected endpoint to trigger the analysis of a project.
    This clones the repo, parses code files, and stores analysis results.
    """
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    project_data = project_doc.to_dict()
    if project_data.get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized for this project")

    project_ref.update({"status": "analyzing"})
    github_url = project_data.get('github_url')
    
    analysis_results = []
    project_stats = { 'total_files': 0, 'parsed_files': 0, 'languages': set() }
    
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            print(f"Cloning {github_url} into {temp_dir}...")
            git.Repo.clone_from(github_url, temp_dir)
            print("✅ Successfully cloned.")

            print("Starting code parsing with tree-sitter...")
            for root, dirs, files in os.walk(temp_dir):
                dirs[:] = [d for d in dirs if d not in {'.git', 'node_modules', 'build', 'dist'}]
                
                for file in files:
                    project_stats['total_files'] += 1
                    file_path = os.path.join(root, file)
                    
                    # Use our robust parser
                    parsed_data = parse_code_file(file_path)
                    
                    if parsed_data:
                        # Update stats and results
                        analysis_results.append(parsed_data)
                        project_stats['parsed_files'] += 1
                        project_stats['languages'].add(parsed_data.get('language'))
                        print(f"   ✅ Parsed {file_path}")

            project_stats['languages'] = list(project_stats['languages'])
            
            # Store full analysis in a subcollection
            analysis_data = {
                'files': analysis_results,
                'stats': project_stats,
                'analyzed_at': datetime.utcnow()
            }
            project_ref.collection('analysis').document('latest').set(analysis_data)
            
            # Update the main project document with a summary and final status
            project_ref.update({
                "status": "completed",
                "last_analyzed": datetime.utcnow(),
                "analysis_summary": project_stats
            })
            print("✅ Analysis complete and results stored.")

        except Exception as e:
            # ... (Error handling remains the same) ...
            project_ref.update({"status": "error", "error_message": f"Analysis failed: {str(e)}"})
            raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    return {
        "message": "Analysis complete!",
        "stats": project_stats
    }

@app.get("/api/projects/{project_id}/analysis")
def get_project_analysis(project_id: str, user: dict = Depends(get_current_user)):
    """
    Get the analysis results for a specific project.
    """
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_doc.to_dict().get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized for this project")

    # Get analysis results
    analysis_ref = db.collection('projects').document(project_id).collection('analysis').document('latest')
    analysis_doc = analysis_ref.get()

    if not analysis_doc.exists:
        raise HTTPException(status_code=404, detail="No analysis found for this project")

    analysis_data = analysis_doc.to_dict()
    
    # Convert datetime objects to ISO format for JSON serialization
    if 'analyzed_at' in analysis_data:
        analysis_data['analyzed_at'] = analysis_data['analyzed_at'].isoformat()

    return analysis_data

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
