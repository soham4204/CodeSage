import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    Book,
    Eye,
    Zap
} from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import Modal from 'react-modal'; 
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

Modal.setAppElement('#root'); 

function ProjectAnalysisPage() {
    const { projectId } = useParams();
    const { currentUser } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [expandedFiles, setExpandedFiles] = useState({});
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedConstruct, setSelectedConstruct] = useState(null);
    const [reviewResult, setReviewResult] = useState('');
    const [isReviewing, setIsReviewing] = useState(false);
    const reviewContentRef = useRef(null);

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

    const handleCodeReview = async (construct, file) => {
        setSelectedConstruct({...construct, fileName: file?.file_path || 'Unknown file'});
        setIsReviewModalOpen(true);
        setIsReviewing(true);
        setReviewResult('');

        try {
            const token = await currentUser.getIdToken();
            const response = await axios.post(
                'http://127.0.0.1:8000/api/review-code',
                { code_snippet: construct.code_snippet, language: file.language },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReviewResult(response.data.review);
        } catch (error) {
            setReviewResult("Error: Could not get code review.");
        } finally {
            setIsReviewing(false);
        }
    };

    const exportToPDF = () => {
        if (!reviewContentRef.current) return;

        html2canvas(reviewContentRef.current, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: [canvas.width, canvas.height],
            });
            pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
            pdf.save(`${selectedConstruct.name}-review.pdf`);
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="text-center">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-cs-red mx-auto mb-6"></div>
                        <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-cs-red/30 animate-ping mx-auto"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Project</h2>
                    <p className="text-cs-gray">This may take a few moments while we process your code...</p>
                    <div className="mt-4 flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-cs-red rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-cs-red rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-cs-red rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="bg-gradient-to-br from-red-950/20 to-red-900/10 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 max-w-md mx-auto text-center shadow-2xl">
                    <div className="flex items-center justify-center w-20 h-20 bg-red-500/20 border-2 border-red-500/40 rounded-full mx-auto mb-6 relative">
                        <AlertCircle size={40} className="text-red-400" />
                        <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse"></div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Analysis Failed</h2>
                    <p className="text-gray-300 mb-8 leading-relaxed">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={fetchAnalysis}
                            className="bg-gradient-to-r from-cs-red to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <RefreshCw size={18} className="mr-2" />
                            Try Again
                        </button>
                        <Link
                            to="/dashboard"
                            className="bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <ArrowLeft size={18} className="mr-2" />
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
            <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 via-black to-gray-800">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md mx-auto text-center shadow-2xl">
                    <div className="flex items-center justify-center w-20 h-20 bg-gray-500/20 border-2 border-gray-500/40 rounded-full mx-auto mb-6">
                        <AlertCircle size={40} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">No Analysis Data</h2>
                    <p className="text-gray-300 mb-8">No analysis data was found for this project.</p>
                    <Link
                        to="/dashboard"
                        className="bg-gradient-to-r from-cs-red to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center mx-auto font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
            <div className="container mx-auto p-6 max-w-7xl">
                {/* Breadcrumb Navigation */}
                <nav className="flex items-center text-sm text-cs-gray mb-8">
                    <Link 
                        to="/dashboard" 
                        className="hover:text-white transition-all duration-200 flex items-center group"
                    >
                        <ArrowLeft size={16} className="mr-2 group-hover:text-cs-red group-hover:-translate-x-1 transition-all duration-200" />
                        <Folder size={16} className="mr-1" />
                        Dashboard
                    </Link>
                    <ChevronRight className="mx-3 w-4 h-4" />
                    <span className="text-white font-medium">Analysis Results</span>
                </nav>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <div className="p-3 bg-gradient-to-br from-cs-red/20 to-cs-red/10 rounded-xl mr-4">
                            <BarChart3 size={40} className="text-cs-red" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white">Project Analysis</h1>
                            <p className="text-xl text-gray-300 mt-1">Detailed insights into your codebase structure and composition</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* README Section */}
                    {analysis.readme_content && (
                        <div className="bg-gradient-to-br from-blue-950/30 to-blue-900/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-8 shadow-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                                <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                                    <Book size={24} className="text-blue-400" />
                                </div>
                                Project Overview (README)
                            </h2>
                            <div className="prose prose-invert prose-lg max-w-none bg-black/20 rounded-xl p-6 border border-blue-500/20">
                                <ReactMarkdown>{analysis.readme_content}</ReactMarkdown>
                            </div>
                        </div>
                    )}

                    {/* Stats Cards */}
                    {safeStats && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-cs-red/50 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cs-red/30 to-cs-red/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <FileText className="w-7 h-7 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-4 py-2 border border-cs-red/30">
                                        <span className="text-xs font-bold text-cs-red tracking-wide">FILES</span>
                                    </div>
                                </div>
                                <p className="text-4xl font-bold text-white mb-2">{safeStats.totalFiles}</p>
                                <p className="text-white text-lg">Total Files</p>
                                <div className="mt-4 flex items-center text-sm text-gray-300">
                                    <Activity size={14} className="mr-2 text-green-400" />
                                    {safeStats.parsedFiles} parsed successfully
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-cs-red/50 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cs-red/30 to-cs-red/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Code className="w-7 h-7 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-4 py-2 border border-cs-red/30">
                                        <span className="text-xs font-bold text-cs-red tracking-wide">LANGUAGES</span>
                                    </div>
                                </div>
                                <p className="text-4xl font-bold text-white mb-2">{safeStats.languages.length}</p>
                                <p className="text-white text-lg">Programming Languages</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {safeStats.languages.slice(0, 3).map((lang, idx) => (
                                        <span 
                                            key={idx} 
                                            className="text-white text-xs px-3 py-1 rounded-full bg-gradient-to-r from-cs-red to-red-600 font-bold shadow-md"
                                        >
                                            {lang}
                                        </span>
                                    ))}
                                    {safeStats.languages.length > 3 && (
                                        <span className="text-white text-xs px-3 py-1 rounded-full bg-gray-600/50 border border-gray-500/30">
                                            +{safeStats.languages.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:border-cs-red/50 transition-all duration-300 group shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cs-red/30 to-cs-red/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                        <Hash className="w-7 h-7 text-cs-red" />
                                    </div>
                                    <div className="bg-cs-red/20 rounded-full px-4 py-2 border border-cs-red/30">
                                        <span className="text-xs font-bold text-cs-red tracking-wide">CONSTRUCTS</span>
                                    </div>
                                </div>
                                <p className="text-4xl font-bold text-white mb-2">{safeStats.totalConstructs}</p>
                                <p className="text-white text-lg">Code Constructs</p>
                                <div className="mt-4 flex items-center text-sm text-gray-300">
                                    <Hash size={14} className="mr-2 text-blue-400" />
                                    Functions, classes & variables
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search and Filter Controls */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search files or constructs..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-14 pr-4 py-4 text-white bg-black/30 rounded-xl border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-300 placeholder-gray-400 backdrop-blur-md"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <select
                                    value={selectedLanguage}
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="pl-14 pr-10 py-4 text-white bg-black/30 rounded-xl border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent appearance-none cursor-pointer min-w-52 backdrop-blur-md"
                                >
                                    <option value="">All Languages</option>
                                    {safeStats?.languages.map((lang, idx) => (
                                        <option key={idx} value={lang}>{lang}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-between text-sm">
                            <span className="text-gray-300">
                                Showing <span className="text-white font-semibold">{filteredFiles.length}</span> of <span className="text-white font-semibold">{analysis.files?.length || 0}</span> files
                            </span>
                            {(searchTerm || selectedLanguage) && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSelectedLanguage('');
                                    }}
                                    className="text-cs-red hover:text-white transition-all duration-200 flex items-center bg-cs-red/10 hover:bg-cs-red/20 px-3 py-2 rounded-lg border border-cs-red/30"
                                >
                                    <X size={14} className="mr-1" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Files Section */}
                    <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
                            <h2 className="text-3xl font-bold text-white flex items-center">
                                <div className="p-2 bg-cs-red/20 rounded-xl mr-4">
                                    <FileText className="w-7 h-7 text-cs-red" />
                                </div>
                                Code Structure & Documentation
                                <span className="ml-4 px-4 py-2 bg-gradient-to-r from-cs-red to-red-600 text-white text-lg rounded-full font-bold shadow-lg">
                                    {filteredFiles.length}
                                </span>
                            </h2>
                        </div>

                        <div className="p-8">
                            {filteredFiles.length === 0 ? (
                                <div className="text-center py-16">
                                    {(analysis.files?.length || 0) === 0 ? (
                                        <div className="max-w-md mx-auto">
                                            <div className="p-4 bg-gray-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                                <FileText size={48} className="text-gray-500" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-3">No Files Found</h3>
                                            <p className="text-gray-300 mb-2">No files were found in this analysis.</p>
                                            <p className="text-sm text-gray-400">The project might not contain supported file types.</p>
                                        </div>
                                    ) : (
                                        <div className="max-w-md mx-auto">
                                            <div className="p-4 bg-gray-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                                <Search size={48} className="text-gray-500" />
                                            </div>
                                            <h3 className="text-xl font-semibold text-white mb-3">No Matches Found</h3>
                                            <p className="text-gray-300 mb-2">No files match your search criteria.</p>
                                            <p className="text-sm text-gray-400">Try adjusting your search or filter settings.</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {filteredFiles.map((file, index) => {
                                        const isExpanded = expandedFiles[file.file_path];
                                        
                                        return (
                                            <div key={file.file_path || index} className="bg-gradient-to-br from-black/40 to-black/20 rounded-2xl border border-gray-600/50 hover:border-cs-red/50 transition-all duration-300 overflow-hidden group shadow-xl hover:shadow-2xl">
                                                <div 
                                                    className="p-8 cursor-pointer hover:bg-white/5 transition-all duration-300"
                                                    onClick={() => toggleFileExpansion(file.file_path)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center space-x-6 flex-1 min-w-0">
                                                            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cs-red/30 to-cs-red/20 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                                <FileText size={20} className="text-cs-red" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-white text-xl truncate group-hover:text-cs-red transition-colors duration-300">
                                                                    {file.file_path || 'Unknown file'}
                                                                </p>
                                                                <div className="flex items-center space-x-6 mt-3">
                                                                    {file.language && (
                                                                        <span className="bg-gradient-to-r from-cs-red to-red-600 text-white text-sm px-4 py-2 rounded-full font-bold shadow-md">
                                                                            {file.language}
                                                                        </span>
                                                                    )}
                                                                    <span className="text-gray-300 bg-black/30 px-3 py-1 rounded-lg border border-gray-600/30">
                                                                        {(file.constructs || []).length} constructs
                                                                    </span>
                                                                    <span className="text-green-400 bg-green-900/20 px-3 py-1 rounded-lg border border-green-600/30">
                                                                        {(file.constructs || []).filter(c => c.documentation).length} documented
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-4">
                                                            <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/20">
                                                                <span className="text-lg text-white font-bold">
                                                                    {(file.constructs || []).length}
                                                                </span>
                                                            </div>
                                                            <div className="p-2">
                                                                {isExpanded ? 
                                                                    <ChevronUp className="w-6 h-6 text-cs-gray group-hover:text-cs-red transition-colors duration-300" /> :
                                                                    <ChevronDown className="w-6 h-6 text-cs-gray group-hover:text-cs-red transition-colors duration-300" />
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {isExpanded && (
                                                    <div className="border-t border-gray-600/50 bg-gradient-to-br from-black/50 to-black/30 p-8">
                                                        {(file.constructs || []).length > 0 ? (
                                                            <div className="grid gap-6">
                                                                {file.constructs.map((construct, cIndex) => {
                                                                    const classSummary = construct.type === 'class'
                                                                        ? analysis.class_summaries?.[construct.name]
                                                                        : null;

                                                                    return (
                                                                        <div
                                                                            key={cIndex}
                                                                            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:shadow-2xl hover:shadow-cs-red/20 transition-all duration-300"
                                                                        >
                                                                            {/* Header Section */}
                                                                            <div className="flex items-center justify-between mb-4">
                                                                            <div className="flex items-center space-x-4">
                                                                                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-600 rounded-xl border border-gray-500 shadow-inner">
                                                                                {getConstructIcon(construct.type)}
                                                                                </div>
                                                                                <div>
                                                                                <span className="text-white font-semibold text-lg">
                                                                                    {construct.name || "Unknown"}
                                                                                </span>
                                                                                <span className="text-xs uppercase tracking-wide text-gray-400 ml-3 bg-gray-700/70 px-3 py-1 rounded-full">
                                                                                    {construct.type || "unknown"}
                                                                                </span>
                                                                                </div>
                                                                            </div>

                                                                            <div className="flex items-center space-x-3">
                                                                                {construct.documentation && (
                                                                                <div className="flex items-center px-3 py-1.5 bg-green-900/40 rounded-full border border-green-600/50">
                                                                                    <Book size={14} className="mr-2 text-green-400" />
                                                                                    <span className="text-xs font-medium text-green-400">Documented</span>
                                                                                </div>
                                                                                )}

                                                                                {/* Code Review Button */}
                                                                                <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleCodeReview(construct, file);
                                                                                }}
                                                                                className="px-3 py-2 flex items-center rounded-lg bg-gradient-to-r from-cs-red/30 to-cs-red/20 hover:from-cs-red/40 hover:to-cs-red/30 border border-cs-red/40 hover:border-cs-red/60 transition-all duration-300 group"
                                                                                >
                                                                                <Eye size={16} className="text-cs-red group-hover:scale-110 transition-transform" />
                                                                                <Zap size={12} className="text-cs-red ml-1 opacity-70" />
                                                                                <span className="ml-2 text-sm text-cs-red font-medium">AI Review</span>
                                                                                </button>
                                                                            </div>
                                                                            </div>

                                                                            {/* Class Summary */}
                                                                            {classSummary && (
                                                                            <div className="mt-6 p-6 bg-blue-950/50 rounded-xl border border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                                                                <div className="flex items-center mb-3">
                                                                                <div className="p-2 bg-blue-600/20 rounded-lg mr-3">
                                                                                    <Book size={16} className="text-blue-400" />
                                                                                </div>
                                                                                <span className="text-lg font-semibold text-blue-400">
                                                                                    AI-Generated Class Summary
                                                                                </span>
                                                                                </div>
                                                                                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                                                                                {classSummary}
                                                                                </pre>
                                                                            </div>
                                                                            )}

                                                                            {/* Documentation */}
                                                                            {construct.documentation && (
                                                                            <div className="mt-6 p-6 bg-green-950/50 rounded-xl border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                                                                <div className="flex items-center mb-3">
                                                                                <div className="p-2 bg-green-600/20 rounded-lg mr-3">
                                                                                    <Book size={16} className="text-green-400" />
                                                                                </div>
                                                                                <span className="text-lg font-semibold text-green-400">
                                                                                    AI-Generated Documentation
                                                                                </span>
                                                                                </div>
                                                                                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
                                                                                {construct.documentation}
                                                                                </pre>
                                                                            </div>
                                                                            )}

                                                                            {/* No Documentation */}
                                                                            {!construct.documentation && construct.code_snippet && (
                                                                            <div className="mt-6 p-4 bg-yellow-950/50 rounded-xl border border-yellow-500/40 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                                                                                <div className="flex items-center">
                                                                                <AlertCircle size={16} className="text-yellow-400 mr-3" />
                                                                                <p className="text-sm text-yellow-400 font-medium">
                                                                                    No documentation generated for this construct
                                                                                </p>
                                                                                </div>
                                                                            </div>
                                                                            )}
                                                                        </div>
                                                                        );

                                                                })}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-12">
                                                                <div className="p-4 bg-gray-500/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                                                    <Code size={32} className="text-gray-500" />
                                                                </div>
                                                                <h4 className="text-lg font-semibold text-white mb-2">No Constructs Found</h4>
                                                                <p className="text-gray-400">No constructs were found in this file</p>
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

                <Modal
                    isOpen={isReviewModalOpen}
                    onRequestClose={() => setIsReviewModalOpen(false)}
                    className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                w-[80vw] max-w-[1200px] max-h-[90vh] bg-gradient-to-br from-gray-800 to-gray-900
                                border border-gray-600/50 rounded-2xl shadow-2xl overflow-x-hidden overflow-y-auto scrollbar-thin
                                p-8 backdrop-blur-xl"
                    overlayClassName="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    style={{ content: { zIndex: 60 } }}
                    >
                    {selectedConstruct && (
                        <div className="flex flex-col w-full max-w-full h-full">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-600/50 backdrop-blur-md bg-white/5 rounded-xl p-4">
                            <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-br from-cs-red/30 to-cs-red/10 rounded-2xl shadow-md">
                                <Eye size={26} className="text-cs-red" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-extrabold bg-cs-red bg-clip-text text-transparent">
                                AI Code Review
                                </h2>
                                <div className="flex items-center space-x-2 mt-1">
                                <p className="text-gray-400">{selectedConstruct.name}</p>
                                <span className="px-2 py-1 text-xs rounded-md bg-gray-700/50 text-gray-300">
                                    {selectedConstruct.fileName}
                                </span>
                                </div>
                            </div>
                            </div>
                            <button
                            onClick={() => setIsReviewModalOpen(false)}
                            className="p-2 hover:bg-gray-700/50 rounded-xl transition-all duration-200 hover:scale-110"
                            >
                            <X size={22} className="text-gray-400 hover:text-white" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                            {isReviewing ? (
                            <div className="flex flex-col items-center justify-center h-full space-y-6">
                                {/* spinner */}
                                <div className="relative">
                                <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-700 border-t-cs-red"></div>
                                <div className="absolute inset-0 rounded-full h-14 w-14 border-4 border-transparent border-t-cs-red/30 animate-ping"></div>
                                </div>
                                <h3 className="text-xl font-semibold text-white">AI is reviewing your code...</h3>
                                <p className="text-gray-400 text-sm">Sit tight while we analyze best practices 🚀</p>
                                <div className="flex space-x-2">
                                <div className="w-3 h-3 bg-cs-red rounded-full animate-bounce"></div>
                                <div className="w-3 h-3 bg-cs-red rounded-full animate-bounce delay-100"></div>
                                <div className="w-3 h-3 bg-cs-red rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                            ) : (
                            <div ref={reviewContentRef} className="prose prose-invert prose-lg max-w-full bg-gradient-to-br from-gray-900/60 to-gray-800/40 p-6 rounded-xl border border-gray-700/40 shadow-inner animate-fade-in text-gray-400">
                                <ReactMarkdown>{reviewResult}</ReactMarkdown>
                            </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        {!isReviewing && (
                            <div className="mt-6 pt-4 border-t border-gray-600/50 flex justify-end space-x-3">
                            <button
                                onClick={() => setIsReviewModalOpen(false)}
                                className="bg-gradient-to-r from-cs-red to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl transition-transform duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                            >
                                Close Review
                            </button>
                            <button onClick={exportToPDF} className="px-6 py-3 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-700/50 transition-all duration-200">
                                Export Report
                            </button>
                            </div>
                        )}
                        </div>
                    )}
                    </Modal>
            </div>
        </div>
    );
}

export default ProjectAnalysisPage;