# main.py
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from auth import get_current_user

# -------------------------------------------------
# ✅ Initialize Firebase Admin SDK
# -------------------------------------------------
# This check prevents re-initialization on hot reloads
if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# -------------------------------------------------
# ✅ Pydantic Model for Project Creation
# -------------------------------------------------
class ProjectCreate(BaseModel):
    github_url: str

# -------------------------------------------------
# ✅ FastAPI App and CORS Middleware
# -------------------------------------------------
app = FastAPI()

# This middleware is crucial. It MUST be configured correctly to handle
# OPTIONS requests from your frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Must match your frontend URL
    allow_credentials=True,
    allow_methods=["*"], # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"], # Allows headers like 'Authorization'
)

# -------------------------------------------------
# ✅ API Endpoints
# -------------------------------------------------
@app.get("/")
def read_root():
    return {"message": "CodeSage Backend is running!"}

@app.get("/api/me")
def read_current_user(user: dict = Depends(get_current_user)):
    return {"uid": user.get("uid"), "email": user.get("email")}

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

# -------------------------------------------------
# ✅ Run Server (for direct execution)
# -------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)