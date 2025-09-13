# main.py
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from auth import get_current_user

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
    user_projects_query = projects_collection.where('owner_uid', '==', owner_uid)
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)