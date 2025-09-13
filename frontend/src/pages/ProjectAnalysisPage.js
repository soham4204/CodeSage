import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
    FileText, 
    ChevronRight, 
    Hash, 
    Type, 
    Code, 
    BarChart3, 
    Filter,
    Search,
    ChevronDown,
    ChevronUp,
    Folder,
    Activity,
    Zap,
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    X
} from 'lucide-react';
import axios from 'axios';

function ProjectAnalysisPage() {
    const { projectId } = useParams();
    const { currentUser } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [expandedFiles, setExpandedFiles] = useState({});

    const fetchAnalysis = useCallback(async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get(`http://127.0.0.1:8000/api/projects/${projectId}/analysis`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setAnalysis(response.data);
        } catch (err) {
            setError('Failed to load analysis data.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentUser, projectId]);

    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    const toggleFileExpansion = (index) => {
        setExpandedFiles(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const filteredFiles = analysis?.files.filter(file => {
        const matchesSearch = file.file_path.toLowerCase().includes(searchTerm.toLowerCase()) ||
            file.constructs.some(construct => construct.name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLanguage = !selectedLanguage || file.language === selectedLanguage;
        return matchesSearch && matchesLanguage;
    }) || [];

    const getConstructIcon = (type) => {
        switch (type) {
            case 'function': return <Hash size={14} className="text-green-400" />;
            case 'class': return <Type size={14} className="text-blue-400" />;
            case 'variable': return <Zap size={14} className="text-yellow-400" />;
            default: return <Code size={14} className="text-gray-400" />;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cs-red mx-auto mb-4"></div>
                    <p className="text-xl text-white">Analyzing your project...</p>
                    <p className="text-cs-gray mt-2">This may take a few moments...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-md mx-auto text-center">
                    <div className="flex items-center justify-center w-16 h-16 bg-red-900/50 border border-red-700 rounded-full mx-auto mb-4">
                        <AlertCircle size={32} className="text-red-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Analysis Failed</h2>
                    <p className="text-cs-gray mb-6">{error}</p>
                    <button 
                        onClick={fetchAnalysis}
                        className="bg-cs-red hover:bg-cs-red-dark text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center mx-auto font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <RefreshCw size={16} className="mr-2" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 max-w-7xl">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center text-sm text-cs-gray mb-8">
                    <Link 
                        to="/dashboard" 
                        className="hover:text-white transition-colors flex items-center group"
                    >
                        <ArrowLeft size={16} className="mr-2 group-hover:text-cs-red" />
                        <Folder size={16} className="mr-1" />
                        Dashboard
                    </Link>
                    <ChevronRight className="mx-3 w-4 h-4" />
                    <span className="text-white font-medium">Analysis Results</span>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-4 flex items-center">
                        <BarChart3 size={40} className="text-cs-red mr-4" />
                        Project Analysis
                    </h1>
                    <p className="text-xl text-white">Detailed insights into your codebase structure and composition</p>
                </div>

                {analysis && (
                    <div className="space-y-8">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:border-cs-red/50 transition-all duration-200 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-cs-red/20 rounded-lg group-hover:bg-cs-red/30 transition-colors">
                                        <FileText className="w-6 h-6 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-3 py-1">
                                        <span className="text-xs font-medium text-cs-red">FILES</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">{analysis.stats.total_files}</p>
                                <p className="text-white">Total Files</p>
                                <div className="mt-4 flex items-center text-sm text-white">
                                    <Activity size={14} className="mr-2" />
                                    {analysis.stats.parsed_files} parsed successfully
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:border-cs-red/50 transition-all duration-200 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-cs-red/20 rounded-lg group-hover:bg-cs-red/30 transition-colors">
                                        <Code className="w-6 h-6 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-3 py-1">
                                        <span className="text-xs font-medium text-cs-red">LANGUAGES</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">{analysis.stats.languages?.length || 0}</p>
                                <p className="text-white">Programming Languages</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {analysis.stats.languages?.slice(0, 3).map((lang, idx) => (
                                        <span 
                                            key={idx} 
                                            className="text-white text-xs px-2 py-1 rounded-full bg-cs-red font-medium"
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                    {analysis.stats.languages?.length > 3 && (
                                        <span className="text-white text-xs px-2 py-1 rounded-full bg-gray-700/50">
                                            +{analysis.stats.languages.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:border-cs-red/50 transition-all duration-200 group">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center justify-center w-12 h-12 bg-cs-red/20 rounded-lg group-hover:bg-cs-red/30 transition-colors">
                                        <Hash className="w-6 h-6 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-3 py-1">
                                        <span className="text-xs font-medium text-cs-red">CONSTRUCTS</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">
                                    {analysis.files.reduce((total, file) => total + file.constructs.length, 0)}
                                </p>
                                <p className="text-white">Code Constructs</p>
                                <div className="mt-4 flex items-center text-sm text-white">
                                    <Hash size={14} className="mr-2" />
                                    Functions, classes & variables
                                </div>
                            </div>
                        </div>

                        {/* Search and Filter Controls */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search files or constructs..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 text-white bg-gray-950 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={selectedLanguage}
                                        onChange={(e) => setSelectedLanguage(e.target.value)}
                                        className="pl-12 pr-8 py-3 text-white bg-gray-950 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent appearance-none cursor-pointer min-w-48"
                                    >
                                        <option value="">All Languages</option>
                                        {analysis.stats.languages?.map((lang, idx) => (
                                            <option key={idx} value={lang}>{lang}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-sm">
                                <span className="text-white">
                                    Showing {filteredFiles.length} of {analysis.files.length} files
                                </span>
                                {(searchTerm || selectedLanguage) && (
                                    <button
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedLanguage('');
                                        }}
                                        className="text-cs-red hover:text-white transition-colors flex items-center"
                                    >
                                        <X size={14} className="mr-1" />
                                        Clear filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Files Section */}
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl overflow-hidden">
                            <div className="p-6 border-b border-gray-500">
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <FileText className="w-6 h-6 mr-3 text-cs-red" />
                                    Code Structure
                                    <span className="ml-3 px-3 py-1 bg-cs-red text-white text-sm rounded-full">
                                        {filteredFiles.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="p-6">
                                {filteredFiles.length === 0 ? (
                                    <div className="text-center py-12">
                                        {analysis.files.length === 0 ? (
                                            <div>
                                                <FileText size={48} className="mx-auto text-gray-600 mb-4" />
                                                <p className="text-cs-gray mb-2">No files found in this analysis.</p>
                                                <p className="text-sm text-cs-gray/70">The project might not contain supported file types.</p>
                                            </div>
                                        ) : (
                                            <div>
                                                <Search size={48} className="mx-auto text-gray-600 mb-4" />
                                                <p className="text-cs-gray mb-2">No files match your search criteria.</p>
                                                <p className="text-sm text-cs-gray/70">Try adjusting your search or filter settings.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredFiles.map((file, index) => {
                                            const isExpanded = expandedFiles[index];
                                            const originalIndex = analysis.files.indexOf(file);
                                            
                                            return (
                                                <div key={index} className="bg-gray-900 rounded-xl border border-gray-600 hover:border-cs-red transition-all duration-200 overflow-hidden group">
                                                    <div 
                                                        className="p-6 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                                        onClick={() => toggleFileExpansion(originalIndex)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                                                                <div className="flex items-center justify-center w-10 h-10 bg-cs-red/20 rounded-lg group-hover:bg-cs-red/30 transition-colors">
                                                                    <FileText size={18} className="text-cs-red" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-semibold text-white text-lg truncate group-hover:text-cs-red transition-colors">
                                                                        {file.file_path}
                                                                    </p>
                                                                    <div className="flex items-center space-x-4 mt-2">
                                                                        {file.language && (
                                                                            <span className="bg-cs-red text-white text-xs px-3 py-1 rounded-full font-medium">
                                                                                {file.language}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-sm text-cs-gray">
                                                                            {file.constructs.length} constructs
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-3">
                                                                <div className="bg-gray-700/50 rounded-lg px-3 py-1">
                                                                    <span className="text-sm text-white font-medium">
                                                                        {file.constructs.length}
                                                                    </span>
                                                                </div>
                                                                {isExpanded ? 
                                                                    <ChevronUp className="w-5 h-5 text-cs-gray group-hover:text-cs-red transition-colors" /> :
                                                                    <ChevronDown className="w-5 h-5 text-cs-gray group-hover:text-cs-red transition-colors" />
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {isExpanded && (
                                                        <div className="border-t border-gray-600 bg-gray-800/30 p-6">
                                                            {file.constructs.length > 0 ? (
                                                                <div className="grid gap-3">
                                                                    {file.constructs.map((construct, cIndex) => (
                                                                        <div key={cIndex} className="flex items-center justify-between bg-gray-950/50 rounded-lg p-4 hover:bg-gray-800/50 transition-colors">
                                                                            <div className="flex items-center space-x-3">
                                                                                <div className="flex items-center justify-center w-8 h-8 bg-gray-700/50 rounded-lg">
                                                                                    {getConstructIcon(construct.type)}
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-white font-medium">{construct.name}</span>
                                                                                    <div className="flex items-center space-x-3 mt-1">
                                                                                        <span className="capitalize bg-cs-red/20 text-cs-red px-2 py-1 rounded text-xs font-medium">
                                                                                            {construct.type}
                                                                                        </span>
                                                                                        <span className="text-xs text-cs-gray">
                                                                                            Line {construct.line}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center py-6">
                                                                    <Code size={32} className="mx-auto text-gray-600 mb-3" />
                                                                    <p className="text-cs-gray">No constructs found in this file</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectAnalysisPage;