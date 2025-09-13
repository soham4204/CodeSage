import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Edit3, Save, X, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';

function ProfilePage() {
    const { currentUser } = useAuth();
    const [profile, setProfile] = useState({ displayName: '', bio: '' });
    const [originalProfile, setOriginalProfile] = useState({ displayName: '', bio: '' });
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState(''); // 'success' or 'error'
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!currentUser) return;
        try {
            const token = await currentUser.getIdToken();
            const response = await axios.get('http://127.0.0.1:8000/api/profile', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile(response.data);
            setOriginalProfile(response.data);
        } catch (error) {
            console.error("Error fetching profile", error);
            setMessage('Failed to load profile data');
            setMessageType('error');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Check for changes
    useEffect(() => {
        const changed = profile.displayName !== originalProfile.displayName || 
                       profile.bio !== originalProfile.bio;
        setHasChanges(changed);
        if (!changed) {
            setMessage('');
        }
    }, [profile, originalProfile]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
        setMessage(''); // Clear messages on input
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage('');
        
        try {
            const token = await currentUser.getIdToken();
            await axios.post('http://127.0.0.1:8000/api/profile', profile, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setOriginalProfile(profile);
            setMessage('Profile updated successfully!');
            setMessageType('success');
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                if (messageType === 'success') {
                    setMessage('');
                }
            }, 3000);
        } catch (error) {
            setMessage('Failed to update profile. Please try again.');
            setMessageType('error');
            console.error("Error updating profile", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setProfile(originalProfile);
        setMessage('');
    };

    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2) || currentUser?.email?.charAt(0).toUpperCase() || '?';
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cs-red mx-auto mb-4"></div>
                    <p className="text-cs-gray">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            {/* Header Section */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">Profile Settings</h1>
                <p className="text-cs-gray">Manage your personal information and preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="lg:col-span-1">
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
                        <div className="text-center">
                            {/* Avatar */}
                            <div className="w-24 h-24 bg-gradient-to-r from-cs-red to-red-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg">
                                {getInitials(profile.displayName || currentUser?.email || '')}
                            </div>
                            
                            <h3 className="text-xl font-semibold text-white mb-1">
                                {profile.displayName || 'No display name set'}
                            </h3>
                            
                            <div className="flex items-center justify-center text-cs-gray text-sm mb-4">
                                <Mail size={16} className="mr-2" />
                                {currentUser?.email}
                            </div>
                            
                            {profile.bio && (
                                <div className="text-cs-gray text-sm leading-relaxed">
                                    {profile.bio}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-8 border border-gray-700">
                        <div className="flex items-center mb-6">
                            <Edit3 size={20} className="text-cs-red mr-2" />
                            <h2 className="text-2xl font-bold text-white">Edit Profile</h2>
                        </div>

                        {/* Message Display */}
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
                            </div>
                        )}

                        <div className="space-y-6">
                            {/* Display Name Field */}
                            <div>
                                <label className="flex items-center text-sm font-semibold text-cs-gray mb-2">
                                    <User size={16} className="mr-2" />
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    name="displayName"
                                    value={profile.displayName}
                                    onChange={handleChange}
                                    placeholder="Enter your display name"
                                    className="w-full p-4 text-white bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                />
                                <p className="text-xs text-cs-gray mt-2">
                                    This is how your name will appear to others
                                </p>
                            </div>

                            {/* Bio Field */}
                            <div>
                                <label className="flex items-center text-sm font-semibold text-cs-gray mb-2">
                                    <Edit3 size={16} className="mr-2" />
                                    Bio
                                </label>
                                <textarea
                                    name="bio"
                                    value={profile.bio}
                                    onChange={handleChange}
                                    rows="4"
                                    placeholder="Tell us a bit about yourself..."
                                    className="w-full p-4 text-white bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cs-red focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                                />
                                <p className="text-xs text-cs-gray mt-2">
                                    {profile.bio.length}/500 characters
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-700">
                            <div className="flex items-center gap-3">
                                {hasChanges && (
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="flex items-center px-4 py-2 text-sm font-medium text-cs-gray bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors duration-200"
                                    >
                                        <X size={16} className="mr-2" />
                                        Cancel
                                    </button>
                                )}
                            </div>
                            
                            <button
                                type="submit"
                                disabled={!hasChanges || isSaving}
                                className={`flex items-center px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                                    hasChanges && !isSaving
                                        ? 'bg-cs-red text-white hover:bg-cs-red-dark shadow-lg hover:shadow-xl transform hover:scale-105'
                                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                {isSaving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} className="mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                        
                        {!hasChanges && !message && (
                            <p className="text-xs text-cs-gray text-center mt-4">
                                Make changes above to update your profile
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ProfilePage;