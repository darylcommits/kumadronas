// ProfileSettings.js - User profile settings with avatar upload functionality
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Bell, 
  Shield, 
  Save, 
  Camera,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  Smartphone,
  GraduationCap,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

const ProfileSettings = ({ user, onProfileUpdate }) => {
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    student_number: user?.student_number || '',
    year_level: user?.year_level || '',
    role: user?.role || '',
    avatar_url: user?.avatar_url || ''
  });

  // Avatar upload state
  const [avatarUpload, setAvatarUpload] = useState({
    file: null,
    preview: null,
    uploading: false
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    sms_notifications: false,
    duty_reminders: true,
    schedule_updates: true,
    system_announcements: true
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        student_number: user.student_number || '',
        year_level: user.year_level || '',
        role: user.role || '',
        avatar_url: user.avatar_url || ''
      });
    }
    fetchNotificationSettings();
  }, [user]);

  const fetchNotificationSettings = async () => {
    try {
      // In a real app, fetch from user preferences table
      // For now, using default values
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  // Avatar upload functions
  const handleAvatarSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please select a valid image file (JPEG, PNG, or WebP)' });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'Image size must be less than 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarUpload({
        file: file,
        preview: e.target.result,
        uploading: false
      });
      setMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async () => {
    if (!avatarUpload.file) return null;

    setAvatarUpload(prev => ({ ...prev, uploading: true }));

    try {
      // Generate unique filename
      const fileExt = avatarUpload.file.name.split('.').pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Delete old avatar if exists
      if (profileData.avatar_url) {
        const oldFileName = profileData.avatar_url.split('/').pop();
        await supabase.storage
          .from('user-uploads')
          .remove([`avatars/${oldFileName}`]);
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-uploads')
        .upload(filePath, avatarUpload.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-uploads')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    } finally {
      setAvatarUpload(prev => ({ ...prev, uploading: false }));
    }
  };

  const removeAvatar = async () => {
    try {
      setAvatarUpload({ file: null, preview: null, uploading: false });
      
      if (profileData.avatar_url) {
        // Remove from storage
        const fileName = profileData.avatar_url.split('/').pop();
        await supabase.storage
          .from('user-uploads')
          .remove([`avatars/${fileName}`]);

        // Update database
        const { error } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user.id);

        if (error) throw error;

        setProfileData(prev => ({ ...prev, avatar_url: '' }));
        setMessage({ type: 'success', text: 'Avatar removed successfully!' });
        
        if (onProfileUpdate) {
          onProfileUpdate({ ...user, avatar_url: null });
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing avatar: ' + error.message });
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let avatarUrl = profileData.avatar_url;

      // Upload new avatar if selected
      if (avatarUpload.file) {
        avatarUrl = await uploadAvatar();
      }

      // FIXED: Get current user session for RLS
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Authentication required. Please log in again.');
      }

      // FIXED: Use authenticated user's ID and proper RLS-compliant update
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.full_name,
          phone_number: profileData.phone_number,
          student_number: profileData.student_number,
          year_level: profileData.year_level,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id) // Use authenticated user's ID
        .eq('email', currentUser.email); // Additional security check

      if (error) {
        console.error('Profile update error:', error);
        if (error.code === '42501' || error.message.includes('row-level security')) {
          throw new Error('Permission denied. Please contact administrator if this persists.');
        }
        throw error;
      }

      // Update local state
      const updatedProfile = { ...profileData, avatar_url: avatarUrl };
      setProfileData(updatedProfile);
      setAvatarUpload({ file: null, preview: null, uploading: false });
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      if (onProfileUpdate) {
        onProfileUpdate({ ...user, ...updatedProfile });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setSaving(false);
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      setSaving(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // In a real app, save to user preferences table
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setMessage({ type: 'success', text: 'Notification preferences updated!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update notification preferences' });
    } finally {
      setSaving(false);
    }
  };

  // Avatar display component
  const AvatarDisplay = ({ size = 'large' }) => {
    const sizeClasses = {
      small: 'w-10 h-10 text-sm',
      medium: 'w-16 h-16 text-lg',
      large: 'w-20 h-20 text-2xl'
    };

    const currentAvatar = avatarUpload.preview || profileData.avatar_url;

    if (currentAvatar) {
      return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-white shadow-lg`}>
          <img
            src={currentAvatar}
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    return (
      <div className={`${sizeClasses[size]} bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
        <span className="text-white font-bold">
          {user?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
        </span>
      </div>
    );
  };

  const tabs = [
    { id: 'personal', label: 'Personal Info', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell }
  ];

  const PersonalInfoTab = () => (
    <form onSubmit={handleProfileSubmit} className="space-y-6">
      {/* Avatar Upload Section */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h3>
        <div className="flex items-center space-x-6">
          <div className="relative">
            <AvatarDisplay size="large" />
            {avatarUpload.uploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Photo</span>
              </button>
              
              {(profileData.avatar_url || avatarUpload.preview) && (
                <button
                  type="button"
                  onClick={removeAvatar}
                  className="btn-secondary text-red-600 hover:bg-red-50 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </button>
              )}
            </div>
            
            <p className="text-xs text-gray-500">
              JPG, PNG or WebP. Max size of 5MB.
            </p>
            
            {avatarUpload.file && (
              <p className="text-xs text-blue-600">
                New image selected: {avatarUpload.file.name}
              </p>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleAvatarSelect}
            className="hidden"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <div className="relative">
            <User className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={profileData.full_name}
              onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
              className="input-field pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="email"
              value={profileData.email}
              className="input-field pl-10 bg-gray-50"
              disabled
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed. Contact admin if needed.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="tel"
              value={profileData.phone_number}
              onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
              className="input-field pl-10"
              placeholder="09123456789"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Contact number is required for emergency notifications</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <div className="relative">
            <Shield className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              value={profileData.role?.charAt(0).toUpperCase() + profileData.role?.slice(1)}
              className="input-field pl-10 bg-gray-50 capitalize"
              disabled
            />
          </div>
        </div>

        {user?.role === 'student' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Student Number
              </label>
              <div className="relative">
                <GraduationCap className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={profileData.student_number}
                  onChange={(e) => setProfileData({...profileData, student_number: e.target.value})}
                  className="input-field pl-10"
                  placeholder="2024-12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year Level
              </label>
              <select
                value={profileData.year_level}
                onChange={(e) => setProfileData({...profileData, year_level: e.target.value})}
                className="input-field"
              >
                <option value="">Select Year Level</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || avatarUpload.uploading}
          className="btn-primary flex items-center space-x-2"
        >
          {(saving || avatarUpload.uploading) ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>{avatarUpload.uploading ? 'Uploading...' : 'Saving...'}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <form onSubmit={handlePasswordSubmit} className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Security Information */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security Information</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Last Login</p>
              <p className="text-sm text-gray-600">
                {user?.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
              </p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Account Created</p>
              <p className="text-sm text-gray-600">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
            <Check className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationsTab = () => (
    <form onSubmit={handleNotificationSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
        
        <div className="space-y-4">
          {[
            { key: 'email_notifications', label: 'Email Notifications', description: 'Receive notifications via email' },
            { key: 'sms_notifications', label: 'SMS Notifications', description: 'Receive notifications via text message' },
            { key: 'duty_reminders', label: 'Duty Reminders', description: 'Get reminded about upcoming duties' },
            { key: 'schedule_updates', label: 'Schedule Updates', description: 'Notifications when schedules are updated' },
            { key: 'system_announcements', label: 'System Announcements', description: 'Important system-wide announcements' }
          ].map(({ key, label, description }) => (
            <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
              <button
                type="button"
                onClick={() => setNotificationSettings({
                  ...notificationSettings,
                  [key]: !notificationSettings[key]
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notificationSettings[key] ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationSettings[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="btn-primary flex items-center space-x-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`flex items-center space-x-2 p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="card">
        <div className="flex items-center space-x-4 mb-6">
          <AvatarDisplay size="large" />
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{user?.full_name}</h3>
            <p className="text-gray-600 capitalize">{user?.role}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="ml-auto p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Upload new avatar"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'personal' && <PersonalInfoTab />}
        {activeTab === 'security' && <SecurityTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
      </div>
    </div>
  );
};

export default ProfileSettings;