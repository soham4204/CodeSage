# main.py
import uvicorn
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from pydantic import BaseModel
from auth import get_current_user
import git
import tempfile 
import os
from parser import parse_code_file
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)

db = firestore.client()

# 🔑 Ensure key is present
groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    raise RuntimeError("❌ GROQ_API_KEY is not set. Please add it to your .env file.")

groq_client = Groq(api_key=groq_api_key)

class ProjectCreate(BaseModel):
    github_url: str
    
class ProjectUpdate(BaseModel):
    name: str
    
class UserProfile(BaseModel):
    displayName: str
    bio: str

class CodeReviewRequest(BaseModel):
    code_snippet: str
    language: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "CodeSage Backend is running!"}

@app.get("/api/me")
def read_current_user(user: dict = Depends(get_current_user)):
    return {"uid": user.get("uid"), "email": user.get("email")}

@app.get("/api/profile")
def get_profile(user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    profile_ref = db.collection("profiles").document(uid)
    profile_doc = profile_ref.get()

    if profile_doc.exists:
        return profile_doc.to_dict()
    else:
        return {"displayName": "", "bio": ""}

@app.post("/api/profile")
def update_profile(profile: UserProfile, user: dict = Depends(get_current_user)):
    uid = user.get("uid")
    profile_ref = db.collection("profiles").document(uid)

    profile_data = {
        "displayName": profile.displayName,
        "bio": profile.bio,
        "updated_at": datetime.utcnow()
    }

    profile_ref.set(profile_data, merge=True)
    return {"message": "Profile updated successfully!"}

@app.post("/api/projects")
def create_project(project_data: ProjectCreate, user: dict = Depends(get_current_user)):
    owner_uid = user.get("uid")
    project_name = project_data.github_url.split("/")[-1]
    if project_name.endswith('.git'):
        project_name = project_name[:-4]  # Remove .git extension
        
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
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    if project_doc.to_dict().get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")

    project_ref.delete()
    return {"message": "Project deleted successfully"}

def _generate_doc_for_snippet(code_snippet: str, language: str) -> str:
    """Helper function to call the Groq API. (Internal use)"""
    if not code_snippet or not code_snippet.strip():
        return ""
    
    prompt = f"""
    You are an expert programmer writing technical documentation. Based on the following {language} code, 
    write a concise and clear docstring. The documentation should explain:
    1. What the code does. 2. Its parameters. 3. What it returns.
    Format the output as a professional docstring for the language. Do not include the original code.

    Code:
    ```{language}
    {code_snippet}
    ```
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=500
        )
        
        # Handle response format
        response = chat_completion.choices[0].message.content
        return response.strip() if response else "Failed to generate documentation."
        
    except Exception as e:
        print(f"Groq API call failed: {e}")
        return "Failed to generate documentation."

def _generate_class_summary(class_snippet: str, method_docs: list, language: str) -> str:
    """
    Generates a high-level summary for a class using its code and method documentation.
    """
    if not class_snippet or not class_snippet.strip():
        return "No class code available for summary generation."

    # Format the method documentation for the prompt
    if method_docs and len(method_docs) > 0:
        methods_summary = "\n".join(
            f"- Method `{md.get('name', 'unknown')}` ({md.get('type', 'method')}): {md.get('documentation', 'No documentation available')}" 
            for md in method_docs if md.get('name')
        )
    else:
        methods_summary = "No methods found or documented for this class."

    prompt = f"""
    You are a senior technical writer summarizing a code library. Based on the following {language} class's source code 
    and the AI-generated documentation for its individual methods, write a high-level summary. 

    The summary should:
    1. Explain the class's purpose and main responsibilities
    2. Describe how the class fits into the broader codebase
    3. Provide a simple code example of how to instantiate and use it
    4. Keep it concise but informative (2-4 paragraphs max)

    Do not repeat the method documentation verbatim; synthesize it into a coherent overview.

    Class Source Code:
    ```{language}
    {class_snippet}
    ```

    Methods Documentation:
    {methods_summary}
    """
    
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.1-8b-instant",
            temperature=0.3,
            max_tokens=1000
        )
        
        response = chat_completion.choices[0].message.content
        
        if not response or response.strip() == "":
            return "Failed to generate class summary: Empty response from AI."
            
        return response.strip()
        
    except Exception as e:
        print(f"Groq API call for class summary failed: {e}")
        return f"Failed to generate class summary: {str(e)}"

def run_full_analysis(project_id: str, github_url: str):
    """
    FINAL VERSION: 
    - Clones repo
    - Parses code
    - Generates construct docs
    - Generates class summaries
    - Generates a project README
    - Stores results in Firestore
    """
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get().to_dict()
    project_name = project_doc.get("name", "Unknown Project")

    try:
        project_ref.update({"status": "analyzing"})

        analysis_results = []
        project_stats = {"total_files": 0, "parsed_files": 0, "languages": set()}

        with tempfile.TemporaryDirectory() as temp_dir:
            try:
                print(f"Cloning {github_url} into {temp_dir}...")
                git.Repo.clone_from(github_url, temp_dir)
                print("✅ Successfully cloned.")

                print("Starting code parsing with tree-sitter...")
                for root, dirs, files in os.walk(temp_dir):
                    # Skip unnecessary dirs
                    dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "build", "dist", "__pycache__", ".venv"}]

                    for file in files:
                        project_stats["total_files"] += 1
                        file_path = os.path.join(root, file)

                        try:
                            parsed_data = parse_code_file(file_path)

                            if parsed_data:
                                # --- STAGE 1: Construct-level documentation ---
                                for construct in parsed_data.get("constructs", []):
                                    if construct.get("code_snippet"):
                                        print(f"Generating doc for: {construct['name']} in {parsed_data['file_path']}")
                                        docstring = _generate_doc_for_snippet(
                                            construct["code_snippet"], parsed_data["language"]
                                        )
                                        construct["documentation"] = docstring

                                analysis_results.append(parsed_data)
                                project_stats["parsed_files"] += 1
                                project_stats["languages"].add(parsed_data.get("language"))
                                print(f"   ✅ Parsed {file_path}")
                        except Exception as e:
                            print(f"   ❌ Error parsing {file_path}: {e}")
                            continue

                project_stats["languages"] = list(project_stats["languages"])

                # --- STAGE 2: Generate Class Summaries ---
                print("Generating class summaries...")
                class_summaries = {}

                all_constructs = []
                for file_data in analysis_results:
                    print(f"Processing file: {file_data.get('file_path', 'unknown')}")
                    constructs = file_data.get("constructs", [])
                    print(f"  Found {len(constructs)} constructs")
                    for construct in constructs:
                        construct['file_path'] = file_data.get("file_path", "unknown")
                        construct['language'] = file_data.get("language", "unknown")
                        all_constructs.append(construct)
                        print(f"  - {construct.get('type', 'unknown')}: {construct.get('name', 'unnamed')} (parent: {construct.get('parent_class', 'None')})")

                unique_classes = {}
                for construct in all_constructs:
                    if construct.get("type") == "class":
                        class_name = construct.get("name")
                        if class_name and class_name not in unique_classes:
                            unique_classes[class_name] = construct

                print(f"Found {len(unique_classes)} unique classes: {list(unique_classes.keys())}")

                for class_name, class_construct in unique_classes.items():
                    print(f"Processing class: {class_name}")
                    
                    methods_for_class = []

                    # Method 1: from parent_class field
                    for construct in all_constructs:
                        if (construct.get("type") in ["method", "function"] and 
                            construct.get("parent_class") == class_name and
                            construct.get("documentation")):
                            methods_for_class.append({
                                "name": construct.get("name"),
                                "documentation": construct.get("documentation"),
                                "type": construct.get("type")
                            })
                            print(f"  Found method via parent_class: {construct.get('name')}")

                    # Method 2: from class.methods array
                    if 'methods' in class_construct:
                        class_methods = class_construct.get('methods', [])
                        for method in class_methods:
                            if method.get("documentation"):
                                methods_for_class.append({
                                    "name": method.get("name"),
                                    "documentation": method.get("documentation"),
                                    "type": method.get("type", "method")
                                })
                                print(f"  Found method via class.methods: {method.get('name')}")

                    # Remove duplicates
                    seen_methods = set()
                    unique_methods = []
                    for method in methods_for_class:
                        method_key = method["name"]
                        if method_key not in seen_methods:
                            seen_methods.add(method_key)
                            unique_methods.append(method)
                    
                    methods_for_class = unique_methods
                    print(f"  Total unique methods for {class_name}: {len(methods_for_class)}")

                    # Generate summary
                    if class_construct.get("code_snippet"):
                        try:
                            summary = _generate_class_summary(
                                class_construct["code_snippet"], 
                                methods_for_class, 
                                class_construct.get("language", "python")
                            )
                            if summary and not summary.startswith("Failed to generate"):
                                class_summaries[class_name] = summary
                                print(f"✅ Generated summary for class: {class_name}")
                            else:
                                print(f"❌ Failed to generate summary for class: {class_name}")
                        except Exception as e:
                            print(f"❌ Error generating summary for class {class_name}: {e}")
                    else:
                        print(f"❌ No code snippet for class: {class_name}")

                print(f"✅ Generated {len(class_summaries)} class summaries total.")

                # --- STAGE 3: Generate Project README ---
                print("Generating project README...")
                if class_summaries:
                    readme_content = _generate_project_readme(project_name, project_stats, class_summaries)
                    print("✅ README generated.")
                else:
                    print("No class summaries available to generate README.")
                    readme_content = f"# {project_name}\n\nNo classes were found to generate a detailed README."

                # --- STAGE 4: Store results in Firestore ---
                analysis_data = {
                    "files": analysis_results,
                    "class_summaries": class_summaries,
                    "readme_content": readme_content,
                    "stats": project_stats,
                    "analyzed_at": datetime.utcnow()
                }

                analysis_ref = db.collection('projects').document(project_id).collection('analysis').document('latest')
                analysis_ref.set(analysis_data)

                project_ref.update({
                    "status": "completed",
                    "last_analyzed": datetime.utcnow()
                })

                print(f"✅ Analysis complete for project {project_id}")

            except git.exc.GitCommandError as e:
                print(f"❌ Git clone failed: {e}")
                project_ref.update({"status": "failed", "error": f"Failed to clone repository: {str(e)}"})
            except Exception as e:
                print(f"❌ Analysis failed: {e}")
                project_ref.update({"status": "failed", "error": str(e)})

    except Exception as e:
        print(f"❌ Critical error in analysis: {e}")
        project_ref.update({"status": "failed", "error": str(e)})

@app.post("/api/projects/{project_id}/analyze")
def analyze_project(project_id: str, background_tasks: BackgroundTasks, user: dict = Depends(get_current_user)):
    """
    Protected endpoint to trigger the analysis of a project.
    Now runs asynchronously in the background.
    """
    owner_uid = user.get("uid")
    project_ref = db.collection('projects').document(project_id)
    project_doc = project_ref.get()

    if not project_doc.exists:
        raise HTTPException(status_code=404, detail="Project not found")

    project_data = project_doc.to_dict()
    if project_data.get('owner_uid') != owner_uid:
        raise HTTPException(status_code=403, detail="Not authorized for this project")

    github_url = project_data.get('github_url')
    
    # Update status immediately to give user feedback
    project_ref.update({"status": "queued"})
    
    # Add the long-running task to be executed in the background
    background_tasks.add_task(run_full_analysis, project_id, github_url)
    
    return {"message": f"Full analysis for '{project_data.get('name')}' has started."}

def _generate_project_readme(project_name: str, stats: dict, class_summaries: dict) -> str:
    """
    Generates a README.md for the project using overall stats and class summaries.
    Enhanced with better error handling and fallback content.
    """
    print(f"Generating README for {project_name}")
    print(f"Stats: {stats}")
    print(f"Class summaries count: {len(class_summaries) if class_summaries else 0}")
    
    # Create a basic README even if no class summaries exist
    if not class_summaries:
        basic_readme = f"""# {project_name}

        ## Project Overview
        This project contains {stats.get('total_files', 0)} files, with {stats.get('parsed_files', 0)} successfully parsed files.

        ## Tech Stack
        - **Languages**: {', '.join(stats.get('languages', ['Unknown']))}
        - **Files Analyzed**: {stats.get('parsed_files', 0)} out of {stats.get('total_files', 0)}

        ## Project Structure
        The codebase contains various functions and components. Detailed class documentation was not available during analysis.

        ## Getting Started
        1. Clone the repository
        2. Install dependencies
        3. Follow language-specific setup instructions
        """
        return basic_readme

    # Format the class summaries for the prompt
    summaries_text = ""
    for class_name, summary in class_summaries.items():
        summaries_text += f"\n\n**Class: {class_name}**\n{summary}\n"
    
    print(f"Formatted summaries length: {len(summaries_text)}")

    prompt = f"""Write a professional README.md file in Markdown format for the following project:

            Project Name: {project_name}

            Project Statistics:
            - Total files: {stats.get('total_files', 0)}
            - Successfully parsed: {stats.get('parsed_files', 0)}
            - Languages: {', '.join(stats.get('languages', ['Unknown']))}

            Key Classes and Components:
            {summaries_text}

            Please create a README with these sections:
            1. # Project Title
            2. ## Overview (2-3 sentences about what the project does)
            3. ## Tech Stack (based on languages found)
            4. ## Key Components (describe the main classes)
            5. ## Getting Started (generic setup instructions)
            6. ## Project Structure (brief overview)

            Keep it professional and concise. Use proper Markdown formatting."""

    try:
        print("Calling Groq API for README generation...")
        
        # Try multiple models in order of preference
        models_to_try = [
            "llama-3.1-8b-instant",  
            "mixtral-8x7b-32768",    
            "llama3-8b-8192"         
        ]
        
        for model in models_to_try:
            try:
                print(f"Trying model: {model}")
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model,
                    temperature=0.4,
                    max_tokens=2000  # Increased for longer README
                )
                
                response = chat_completion.choices[0].message.content
                if response and response.strip():
                    print(f"✅ Successfully generated README with model: {model}")
                    return response.strip()
                else:
                    print(f"Empty response from model: {model}")
                    continue
                    
            except Exception as model_error:
                print(f"Model {model} failed: {str(model_error)}")
                continue
        
        # If all models fail, return a fallback README
        print("All models failed, generating fallback README")
        raise Exception("All Groq models failed")
        
    except Exception as e:
        print(f"Groq API call for README failed: {e}")
        
        # Generate a detailed fallback README using the available data
        fallback_readme = f"""# {project_name}

        ## Overview
        This project has been automatically analyzed and contains {stats.get('parsed_files', 0)} parsed files across {len(stats.get('languages', []))} programming languages.

        ## Tech Stack
        - **Languages**: {', '.join(stats.get('languages', ['Unknown']))}
        - **Total Files**: {stats.get('total_files', 0)}
        - **Successfully Parsed**: {stats.get('parsed_files', 0)}

        ## Key Components

        """
        
        # Add class information manually
        for class_name, summary in class_summaries.items():
            fallback_readme += f"### {class_name}\n{summary}\n\n"
        
        fallback_readme += """## Getting Started

        1. Clone this repository
        2. Install the required dependencies for your chosen language
        3. Review the component documentation above
        4. Follow standard setup procedures for the identified tech stack

        ## Notes
        This README was automatically generated based on code analysis. Some sections may need manual updates.
        """
        
        return fallback_readme
    
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

def _generate_code_review(code_snippet: str, language: str) -> str:
    """Enhanced helper function with better error handling and debugging."""
    print(f"🔍 Code review request - Language: {language}, Code length: {len(code_snippet) if code_snippet else 0}")
    
    if not code_snippet or not code_snippet.strip():
        return "❌ No code provided for review."

    # Truncate very long code snippets to avoid token limits
    max_code_length = 4000
    if len(code_snippet) > max_code_length:
        code_snippet = code_snippet[:max_code_length] + "\n... (code truncated)"
        print(f"⚠️ Code truncated to {max_code_length} characters")

    prompt = f"""
    You are an expert code reviewer and senior software engineer. Analyze the following {language} code snippet. 
    Your task is to identify potential issues and suggest improvements.

    Structure your feedback in Markdown format with the following sections:
    - **🔒 Security Vulnerabilities**: Check for risks like injection, hardcoded secrets, etc.
    - **⚡ Performance Issues**: Look for inefficient loops, redundant operations, or memory issues.
    - **🐛 Bugs & Logic Errors**: Identify potential bugs, null pointer issues, or logical flaws.
    - **✨ Style & Best Practices**: Suggest improvements for clarity, naming conventions, and code quality.
    - **📝 Documentation**: Comment on code documentation and readability.

    For each issue, provide:
    1. Brief explanation of the problem
    2. Concrete suggestion for improvement
    3. Example fix if applicable

    If no issues are found in a category, state "No issues found."
    If the code is excellent overall, commend it but still provide constructive suggestions.

    Code to review:
    ```{language}
    {code_snippet}
    ```
    """

    try:
        print("🤖 Calling Groq API for code review...")
        
        # Try multiple models in order of preference
        models_to_try = [
            "llama-3.1-8b-instant",
            "llama3-70b-8192",
            "mixtral-8x7b-32768"
        ]
        
        for model in models_to_try:
            try:
                print(f"🔄 Attempting with model: {model}")
                
                chat_completion = groq_client.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model=model,
                    temperature=0.2,
                    max_tokens=1500,  # Increased for detailed reviews
                    top_p=0.9
                )
                
                if not chat_completion.choices:
                    print(f"❌ No choices returned from {model}")
                    continue
                    
                response = chat_completion.choices[0].message.content
                
                if not response or len(response.strip()) < 10:
                    print(f"❌ Empty or too short response from {model}: '{response}'")
                    continue
                    
                print(f"✅ Successfully generated review with {model}")
                print(f"📊 Response length: {len(response)} characters")
                
                return response.strip()
                
            except Exception as model_error:
                print(f"❌ Model {model} failed: {str(model_error)}")
                continue
        
        # If all models fail, return detailed error info
        return f"""## ❌ Code Review Generation Failed

**Error**: All AI models failed to generate a review.

**Possible causes**:
- API key issues with Groq
- Network connectivity problems  
- Code snippet too long or contains problematic content
- API rate limiting

**Code Info**:
- Language: {language}
- Code length: {len(code_snippet)} characters
- Truncated: {'Yes' if len(code_snippet) > max_code_length else 'No'}

**Next steps**:
1. Check your Groq API key and credits
2. Try with a smaller code snippet
3. Check server logs for detailed errors
"""
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ Critical error in code review: {error_msg}")
        
        return f"""## ❌ Code Review Error

**Error**: {error_msg}

**Debug Info**:
- Language: {language}
- Code length: {len(code_snippet)} characters
- Groq API Key present: {'Yes' if groq_api_key else 'No'}

Please check:
1. Groq API configuration
2. Network connectivity
3. API rate limits
4. Server logs for more details
"""

@app.post("/api/review-code")
def review_code_snippet(request: CodeReviewRequest, user: dict = Depends(get_current_user)):
    """
    Enhanced endpoint with better logging and error handling.
    """
    print(f"📥 Code review request from user: {user.get('uid', 'unknown')}")
    print(f"📋 Request: language={request.language}, code_length={len(request.code_snippet)}")
    
    # Validate inputs
    if not request.code_snippet or not request.code_snippet.strip():
        return {"error": "Code snippet cannot be empty", "review": None}
    
    if not request.language or not request.language.strip():
        request.language = "unknown"
    
    # Generate the review
    try:
        review = _generate_code_review(request.code_snippet, request.language)
        
        if not review:
            return {"error": "Generated review is empty", "review": "No review content was generated."}
        
        print(f"✅ Code review generated successfully ({len(review)} chars)")
        return {"review": review, "error": None}
        
    except Exception as e:
        error_msg = f"Failed to generate code review: {str(e)}"
        print(f"❌ {error_msg}")
        return {"error": error_msg, "review": None}

# Additional debugging endpoint (optional - remove in production)
@app.get("/api/debug/groq-status")
def check_groq_status(user: dict = Depends(get_current_user)):
    """Debug endpoint to check Groq API status."""
    try:
        # Simple test call
        test_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": "Say hello"}],
            model="llama-3.1-8b-instant",
            max_tokens=10
        )
        
        return {
            "status": "working",
            "api_key_present": bool(groq_api_key),
            "test_response": test_completion.choices[0].message.content if test_completion.choices else "No response"
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "api_key_present": bool(groq_api_key)
        }
    
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)