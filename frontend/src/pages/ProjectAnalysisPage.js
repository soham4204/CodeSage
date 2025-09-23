import { useState, useEffect, useCallback, useMemo } from 'react';
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
    RefreshCw,
    AlertCircle,
    ArrowLeft,
    X,
    Book
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

function ProjectAnalysisPage() {
    const { projectId } = useParams();
    const { currentUser } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [expandedFiles, setExpandedFiles] = useState({});

    // Debug logging
    useEffect(() => {
        console.log('ProjectAnalysisPage - projectId:', projectId);
        console.log('ProjectAnalysisPage - currentUser:', currentUser?.uid);
        console.log('ProjectAnalysisPage - analysis:', analysis);
        console.log('ProjectAnalysisPage - error:', error);
        console.log('ProjectAnalysisPage - isLoading:', isLoading);
    }, [projectId, currentUser, analysis, error, isLoading]);

    // Data validation helper
    const validateAnalysisData = (data) => {
        if (!data) {
            console.error('Analysis data is null/undefined');
            return false;
        }
        if (!data.files || !Array.isArray(data.files)) {
            console.error('Analysis data missing files array:', data);
            return false;
        }
        if (!data.stats) {
            console.error('Analysis data missing stats:', data);
            return false;
        }
        return true;
    };

    const fetchAnalysis = useCallback(async () => {
        if (!currentUser) {
            console.log('No current user, skipping fetch');
            return;
        }

        setIsLoading(true);
        setError('');

        // Create abort controller for cleanup
        const abortController = new AbortController();

        try {
            console.log('Fetching analysis for project:', projectId);
            const token = await currentUser.getIdToken();
            const response = await axios.get(
                `http://127.0.0.1:8000/api/projects/${projectId}/analysis`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: abortController.signal,
                }
            );

            console.log('API Response:', response.data);

            // Validate response structure
            if (!validateAnalysisData(response.data)) {
                throw new Error('Invalid analysis data structure received from server');
            }

            setAnalysis(response.data);
            setError('');
        } catch (err) {
            if (abortController.signal.aborted) {
                console.log('Request was aborted');
                return;
            }

            console.error('Analysis fetch error:', err);
            
            // More specific error messages
            if (err.response?.status === 404) {
                setError('Analysis not found. The project may not have been analyzed yet.');
            } else if (err.response?.status === 401) {
                setError('Authentication failed. Please try logging in again.');
            } else if (err.response?.status === 403) {
                setError('Access denied. You may not have permission to view this analysis.');
            } else if (err.response?.status === 500) {
                setError('Server error occurred. Please try again later.');
            } else if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
                setError('Request timed out. Please check your connection and try again.');
            } else {
                setError(`Failed to load analysis: ${err.response?.data?.detail || err.message}`);
            }
        } finally {
            setIsLoading(false);
        }

        // Cleanup function
        return () => {
            abortController.abort();
        };
    }, [currentUser, projectId]);

    useEffect(() => {
        fetchAnalysis();
    }, [fetchAnalysis]);

    // Fixed: Use file path as identifier instead of index
    const toggleFileExpansion = (filePath) => {
        setExpandedFiles(prev => ({
            ...prev,
            [filePath]: !prev[filePath]
        }));
    };

    // Memoized filtered files for performance
    const filteredFiles = useMemo(() => {
        if (!analysis?.files) return [];

        return analysis.files.filter(file => {
            const matchesSearch = file.file_path?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (file.constructs || []).some(construct => 
                    construct.name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
            const matchesLanguage = !selectedLanguage || file.language === selectedLanguage;
            return matchesSearch && matchesLanguage;
        });
    }, [analysis?.files, searchTerm, selectedLanguage]);

    // Safe stats calculation
    const safeStats = useMemo(() => {
        if (!analysis?.stats) return null;

        return {
            totalFiles: analysis.stats.total_files || 0,
            parsedFiles: analysis.stats.parsed_files || 0,
            languages: analysis.stats.languages || [],
            totalConstructs: (analysis.files || []).reduce((total, file) => 
                total + ((file.constructs || []).length), 0
            )
        };
    }, [analysis]);

    const getConstructIcon = (type) => {
        switch (type) {
            case 'function': return <Hash size={14} className="text-green-400" />;
            case 'class': return <Type size={14} className="text-blue-400" />;
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
                    <div className="flex gap-4 justify-center">
                        <button 
                            onClick={fetchAnalysis}
                            className="bg-cs-red hover:bg-cs-red-dark text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <RefreshCw size={16} className="mr-2" />
                            Try Again
                        </button>
                        <Link
                            to="/dashboard"
                            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Handle case where analysis is null but no error occurred
    if (!analysis) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-md mx-auto text-center">
                    <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">No Analysis Data</h2>
                    <p className="text-cs-gray mb-6">No analysis data was found for this project.</p>
                    <Link
                        to="/dashboard"
                        className="bg-cs-red hover:bg-cs-red-dark text-white px-6 py-3 rounded-lg transition-all duration-200 flex items-center mx-auto font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Dashboard
                    </Link>
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

                <div className="space-y-8">
                    {/* 🔥 NEW: README Section - Add this FIRST in the space-y-8 div */}
                    {analysis.readme_content && (
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                                <Book size={24} className="text-cs-red mr-3" />
                                Project Overview (README)
                            </h2>
                            <div className="prose prose-invert prose-sm max-w-none">
                                <ReactMarkdown>{analysis.readme_content}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Stats Cards */}
                    {safeStats && (
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
                                <p className="text-3xl font-bold text-white mb-2">{safeStats.totalFiles}</p>
                                <p className="text-white">Total Files</p>
                                <div className="mt-4 flex items-center text-sm text-white">
                                    <Activity size={14} className="mr-2" />
                                    {safeStats.parsedFiles} parsed successfully
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
                                <p className="text-3xl font-bold text-white mb-2">{safeStats.languages.length}</p>
                                <p className="text-white">Programming Languages</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {safeStats.languages.slice(0, 3).map((lang, idx) => (
                                        <span 
                                            key={idx} 
                                            className="text-white text-xs px-2 py-1 rounded-full bg-cs-red font-medium"
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                    {safeStats.languages.length > 3 && (
                                        <span className="text-white text-xs px-2 py-1 rounded-full bg-gray-700/50">
                                            +{safeStats.languages.length - 3} more
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
                                <p className="text-3xl font-bold text-white mb-2">{safeStats.totalConstructs}</p>
                                <p className="text-white">Code Constructs</p>
                                <div className="mt-4 flex items-center text-sm text-white">
                                    <Hash size={14} className="mr-2" />
                                    Functions, classes & variables
                                </div>
                            </div>
                        </div>
                    )}

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
                                    {safeStats?.languages.map((lang, idx) => (
                                        <option key={idx} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between text-sm">
                            <span className="text-white">
                                Showing {filteredFiles.length} of {analysis.files?.length || 0} files
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
                                Code Structure & Documentation
                                <span className="ml-3 px-3 py-1 bg-cs-red text-white text-sm rounded-full">
                                    {filteredFiles.length}
                                </span>
                            </h2>
                        </div>

                        <div className="p-6">
                            {filteredFiles.length === 0 ? (
                                <div className="text-center py-12">
                                    {(analysis.files?.length || 0) === 0 ? (
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
                                        // Fixed: Use file path as key instead of index
                                        const isExpanded = expandedFiles[file.file_path];
                                        
                                        return (
                                            <div key={file.file_path || index} className="bg-gray-900 rounded-xl border border-gray-600 hover:border-cs-red transition-all duration-200 overflow-hidden group">
                                                <div 
                                                    className="p-6 cursor-pointer hover:bg-gray-800/50 transition-colors"
                                                    onClick={() => toggleFileExpansion(file.file_path)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                                                            <div className="flex items-center justify-center w-10 h-10 bg-cs-red/20 rounded-lg group-hover:bg-cs-red/30 transition-colors">
                                                                <FileText size={18} className="text-cs-red" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-white text-lg truncate group-hover:text-cs-red transition-colors">
                                                                    {file.file_path || 'Unknown file'}
                                                                </p>
                                                                <div className="flex items-center space-x-4 mt-2">
                                                                    {file.language && (
                                                                        <span className="bg-cs-red text-white text-xs px-3 py-1 rounded-full font-medium">
                                                                            {file.language}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-sm text-cs-gray">
                                                                        {(file.constructs || []).length} constructs
                                                                    </span>
                                                                    <span className="text-sm text-green-400">
                                                                        {(file.constructs || []).filter(c => c.documentation).length} documented
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-3">
                                                            <div className="bg-gray-700/50 rounded-lg px-3 py-1">
                                                                <span className="text-sm text-white font-medium">
                                                                    {(file.constructs || []).length}
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
                                                        {(file.constructs || []).length > 0 ? (
                                                            <div className="grid gap-3">
                                                                {file.constructs.map((construct, cIndex) => {
                                                                    const classSummary = construct.type === 'class'
                                                                        ? analysis.class_summaries?.[construct.name]
                                                                        : null;

                                                                    return (
                                                                        <div key={cIndex} className="bg-gray-950/50 rounded-lg p-4">
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <div className="flex items-center space-x-3">
                                                                                    <div className="flex items-center justify-center w-8 h-8 bg-gray-700/50 rounded-lg">
                                                                                        {getConstructIcon(construct.type)}
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="text-white font-medium">{construct.name || 'Unknown'}</span>
                                                                                        <span className="text-xs text-cs-gray ml-2">({construct.type || 'unknown'})</span>
                                                                                    </div>
                                                                                </div>
                                                                                {construct.documentation && (
                                                                                    <div className="flex items-center px-2 py-1 bg-green-900/30 rounded-md border border-green-700">
                                                                                        <Book size={12} className="mr-1 text-green-400" />
                                                                                        <span className="text-xs text-green-400 font-medium">Documented</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* ✅ Display Class Summary if it exists */}
                                                                            {classSummary && (
                                                                                <div className="mt-4 p-4 bg-blue-900/20 rounded-md border border-blue-700/30">
                                                                                    <div className="flex items-center mb-2">
                                                                                        <Book size={14} className="mr-2 text-blue-400" />
                                                                                        <span className="text-sm font-medium text-blue-400">AI-Generated Class Summary</span>
                                                                                    </div>
                                                                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                                                        {classSummary}
                                                                                    </pre>
                                                                                </div>
                                                                            )}

                                                                            {/* Display Pre-Generated Documentation */}
                                                                            {construct.documentation && (
                                                                                <div className="mt-4 p-4 bg-black/30 rounded-md border border-gray-600">
                                                                                    <div className="flex items-center mb-2">
                                                                                        <Book size={14} className="mr-2 text-cs-red" />
                                                                                        <span className="text-sm font-medium text-cs-red">AI-Generated Documentation</span>
                                                                                    </div>
                                                                                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                                                                        {construct.documentation}
                                                                                    </pre>
                                                                                </div>
                                                                            )}

                                                                            {!construct.documentation && construct.code_snippet && (
                                                                                <div className="mt-4 p-3 bg-yellow-900/20 rounded-md border border-yellow-700/30">
                                                                                    <p className="text-xs text-yellow-400">No documentation generated for this construct</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}

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
            </div>
        </div>
    );
}

export default ProjectAnalysisPage;