import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Github, 
  Trash2, 
  Edit3, 
  Play, 
  Calendar, 
  ExternalLink, 
  AlertCircle, 
  Check, 
  X,
  Search,
  Filter,
  GitBranch,
} from 'lucide-react';
import axios from 'axios';

function DashboardPage() {
  const { currentUser } = useAuth();
  const [githubUrl, setGithubUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'created', 'analyzing', 'completed'
  const [deletingProject, setDeletingProject] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');

  const fetchProjects = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const token = await currentUser.getIdToken();
      const response = await axios.get('http://127.0.0.1:8000/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProjects(response.data);
    } catch (error) {
      console.error("Error fetching projects", error);
      setMessage(`Error fetching projects: ${error.message}`);
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Auto-hide success messages
  useEffect(() => {
    if (message && messageType === 'success') {
      const timer = setTimeout(() => {
        setMessage('');
        setMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, messageType]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsCreating(true);
    
    if (!githubUrl) {
      setMessage('Please enter a GitHub URL.');
      setMessageType('error');
      setIsCreating(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await axios.post('http://127.0.0.1:8000/api/projects',
        { github_url: githubUrl },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage(response.data.message);
      setMessageType('success');
      setGithubUrl('');
      fetchProjects();
    } catch (error) {
      console.error("Error creating project", error);
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
      setMessageType('error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId) => {
    setDeletingProject(projectId);
    try {
      const token = await currentUser.getIdToken();
      await axios.delete(`http://127.0.0.1:8000/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage("Project deleted successfully.");
      setMessageType('success');
      fetchProjects();
    } catch (error) {
      console.error("Error deleting project", error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    } finally {
      setDeletingProject(null);
    }
  };

  const handleUpdateProject = async (projectId) => {
    if (!newProjectName.trim()) return;
    
    try {
      const token = await currentUser.getIdToken();
      await axios.put(`http://127.0.0.1:8000/api/projects/${projectId}`, 
        { name: newProjectName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage("Project updated successfully.");
      setMessageType('success');
      setEditingProject(null);
      setNewProjectName('');
      fetchProjects();
    } catch (error) {
      console.error("Error updating project", error);
      setMessage(`Error: ${error.message}`);
      setMessageType('error');
    }
  };

  const startEdit = (project) => {
    setEditingProject(project.id);
    setNewProjectName(project.name);
  };

  const cancelEdit = () => {
    setEditingProject(null);
    setNewProjectName('');
  };

  const getGithubOwnerRepo = (url) => {
    try {
      // Normalize URL
      const cleanedUrl = url.replace(/\.git$/, "").replace(/\/+$/, "");
      const match = cleanedUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

      if (match) {
        return `${match[1]}/${match[2]}`;
      }
      return null; // Invalid GitHub URL
    } catch (err) {
      console.error("Error parsing GitHub URL:", err);
      return null;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'created': return 'bg-blue-500';
      case 'analyzing': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.github_url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header Section */}


      {/* Global Message Display */}
      {message && (
        <div className={`flex items-center p-4 rounded-lg mb-6 ${
          messageType === 'success' 
            ? 'bg-green-900/50 border border-green-700 text-green-300'
            : 'bg-red-900/50 border border-red-700 text-red-300'
        }`}>
          {messageType === 'success' ? (
            <Check size={20} className="mr-3 flex-shrink-0" />
          ) : (
            <AlertCircle size={20} className="mr-3 flex-shrink-0" />
          )}
          <span className="text-sm">{message}</span>
          <button
            onClick={() => setMessage('')}
            className="ml-auto text-current opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Project Creation Form */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700 mb-8">
        <div className="flex items-center mb-6">
          <Plus size={24} className="text-cs-red mr-3" />
          <h2 className="text-2xl font-bold text-white">Create a New Project</h2>
        </div>
        
        <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-grow relative">
            <Github size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="w-full pl-12 pr-4 py-4 text-white bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-200 placeholder-gray-400"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className={`px-8 py-4 rounded-lg font-semibold transition-all duration-200 ${
              isCreating
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-cs-red text-white hover:bg-cs-red-dark shadow-lg hover:shadow-xl transform hover:scale-105'
            }`}
          >
            {isCreating ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              <div className="flex items-center">
                <Plus size={20} className="mr-2" />
                Create Project
              </div>
            )}
          </button>
        </form>
      </div>

      {/* Projects Section */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {/* Projects Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <GitBranch size={24} className="text-cs-red mr-3" />
              <h2 className="text-2xl font-bold text-white">Your Projects</h2>
              <span className="ml-3 px-3 py-1 bg-cs-red text-white text-sm rounded-full">
                {projects.length}
              </span>
            </div>
            
            {projects.length > 0 && (
              <div className="flex gap-3">
                {/* Search */}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 text-white bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent text-sm"
                  />
                </div>
                
                {/* Filter */}
                <div className="relative">
                  <Filter size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-2 text-white bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent text-sm appearance-none"
                  >
                    <option value="all">All Status</option>
                    <option value="created">Created</option>
                    <option value="analyzing">Analyzing</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Projects Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cs-red mx-auto mb-4"></div>
                <p className="text-cs-gray">Loading projects...</p>
              </div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              {projects.length === 0 ? (
                <div>
                  <Github size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-cs-gray mb-2">You haven't created any projects yet.</p>
                  <p className="text-sm text-cs-gray/70">Add a GitHub repository above to get started.</p>
                </div>
              ) : (
                <div>
                  <Search size={48} className="mx-auto text-gray-600 mb-4" />
                  <p className="text-cs-gray mb-2">No projects match your search criteria.</p>
                  <p className="text-sm text-cs-gray/70">Try adjusting your search or filter settings.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <div key={project.id} className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 hover:border-cs-red transition-all duration-200 group">
                  {/* Project Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      {editingProject === project.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newProjectName}
                            onChange={(e) => setNewProjectName(e.target.value)}
                            className="flex-1 px-3 py-1 text-white bg-gray-600 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-cs-red text-lg font-bold"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateProject(project.id)}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-1 text-gray-400 hover:text-gray-300"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-xl font-bold text-white truncate group-hover:text-cs-red transition-colors">
                          {project.name}
                        </h3>
                      )}
                      
                      <div className="flex items-center mt-2 text-sm text-cs-gray">
                        <Github size={14} className="mr-2" />
                        <span className="truncate">{getGithubOwnerRepo(project.github_url)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Project Meta */}
                  <div className="flex items-center text-xs text-cs-gray mb-4">
                    <Calendar size={12} className="mr-1" />
                    Created {formatDate(project.created_at)}
                  </div>

                  {/* Project Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                    <button className="flex items-center px-4 py-2 bg-cs-red text-white rounded-lg hover:bg-cs-red-dark transition-colors text-sm font-medium">
                      <Play size={14} className="mr-2" />
                      Analyze
                    </button>
                                      {/* Status Badge */}
                    <div className="flex items-center ml-3">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)} mr-2`}></div>
                      <span className="text-xs text-cs-gray capitalize">{project.status}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a
                        href={project.github_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-cs-gray hover:text-white transition-colors"
                        title="Open GitHub"
                      >
                        <ExternalLink size={16} />
                      </a>
                      
                      <button
                        onClick={() => startEdit(project)}
                        className="p-2 text-cs-gray hover:text-white transition-colors"
                        title="Edit project"
                      >
                        <Edit3 size={16} />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        disabled={deletingProject === project.id}
                        className="p-2 text-cs-gray hover:text-red-400 transition-colors"
                        title="Delete project"
                      >
                        {deletingProject === project.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;