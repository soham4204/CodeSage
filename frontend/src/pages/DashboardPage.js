import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

function DashboardPage() {
  const { currentUser } = useAuth();
  const [githubUrl, setGithubUrl] = useState('');
  const [message, setMessage] = useState('');
  const [projects, setProjects] = useState([]); // State for the list of projects
  const [isLoading, setIsLoading] = useState(true); // Loading state for the project list

  // We wrap this in useCallback to prevent re-creating the function on every render
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
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // useEffect hook to automatically fetch projects when the page loads
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!githubUrl) {
      setMessage('Please enter a GitHub URL.');
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
      setGithubUrl(''); // Clear the input field
      fetchProjects(); // Refresh the project list after creating a new one
    } catch (error) {
      console.error("Error creating project", error);
      setMessage(`Error: ${error.response?.data?.detail || error.message}`);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-4xl font-bold text-white mb-4">
        Welcome to Your Dashboard
      </h1>
      <p className="text-lg text-cs-gray mb-8">
        Logged in as: <span className="font-semibold text-cs-red">{currentUser.email}</span>
      </p>

      {/* Project Creation Form */}
      <div className="mt-8 p-8 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold text-white mb-4">Create a New Project</h2>
        <form onSubmit={handleCreateProject} className="flex flex-col sm:flex-row gap-4">
          <input
            type="url"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="flex-grow p-3 text-white bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-cs-red"
            required
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-cs-red text-white font-semibold hover:bg-cs-red-dark transition-colors"
          >
            Create Project
          </button>
        </form>
        {message && (
          <p className="mt-4 text-sm text-green-400">{message}</p>
        )}
      </div>

      {/* Display Projects List */}
      <div className="mt-12">
        <h2 className="text-3xl font-bold text-white mb-6">Your Projects</h2>
        {isLoading ? (
          <p className="text-cs-gray">Loading projects...</p>
        ) : projects.length === 0 ? (
          <div className="text-center py-10 bg-gray-800 rounded-lg">
            <p className="text-cs-gray">You haven't created any projects yet.</p>
            <p className="text-sm text-cs-gray/70 mt-2">Add a GitHub repository above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-cs-red/20 transition-shadow duration-300">
                <h3 className="text-xl font-bold text-white truncate">{project.name}</h3>
                <p className="text-sm text-cs-gray mt-2 break-all">{project.github_url}</p>
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-cs-gray">Status: </span>
                    <span className="text-xs font-semibold text-green-400 capitalize">{project.status}</span>
                  </div>
                  <button className="text-xs bg-cs-red text-white py-1 px-3 rounded-md hover:bg-cs-red-dark transition-colors">
                    Analyze
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;