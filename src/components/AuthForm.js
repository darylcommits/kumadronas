import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Mail, 
  Lock, 
  UserPlus, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Shield,
  GraduationCap,
  Users,
  CheckCircle
} from 'lucide-react';

const AuthForm = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student',
    studentId: '',
    phoneNumber: '',
    studentNumber: '',
    yearLevel: '1st Year'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (!isLogin) {
      if (!formData.fullName.trim()) {
        setError('Full name is required');
        return false;
      }

      if (formData.role === 'parent' && !formData.studentId.trim()) {
        setError('Student ID is required for parent accounts');
        return false;
      }

      if (formData.role === 'student' && !formData.studentNumber.trim()) {
        setError('Student number is required');
        return false;
      }

      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        // Login
        console.log('Attempting login for:', formData.email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email.trim(),
          password: formData.password,
        });

        if (error) {
          console.error('Login error:', error);
          throw error;
        }

        console.log('Login successful for:', data.user.email);
        setSuccess('Login successful! Redirecting...');
        
        // Create login log
        setTimeout(async () => {
          try {
            await supabase.from('duty_logs').insert({
              action: 'login',
              performed_by: data.user.id,
              notes: 'User logged in successfully'
            });
          } catch (logError) {
            console.warn('Failed to create login log:', logError);
          }
        }, 1000);

      } else {
        // Register
        console.log('Attempting registration for:', formData.email);
        
        // Prepare user metadata
        const userData = {
          full_name: formData.fullName.trim(),
          role: formData.role,
          phone_number: formData.phoneNumber.trim() || null,
          student_number: formData.role === 'student' ? formData.studentNumber.trim() : null,
          year_level: formData.role === 'student' ? formData.yearLevel : null,
          student_id: formData.role === 'parent' ? formData.studentId.trim() : null
        };

        console.log('User metadata for registration:', userData);

        const { data, error } = await supabase.auth.signUp({
          email: formData.email.trim(),
          password: formData.password,
          options: {
            data: userData
          }
        });

        if (error) {
          console.error('Registration error:', error);
          throw error;
        }

        if (data.user) {
          console.log('Registration successful for:', data.user.email);
          
          // The profile should be created automatically by the database trigger
          // But let's also manually create it as a fallback
          try {
            await supabase.from('profiles').insert({
              id: data.user.id,
              email: formData.email.trim(),
              full_name: formData.fullName.trim(),
              role: formData.role,
              phone_number: formData.phoneNumber.trim() || null,
              student_number: formData.role === 'student' ? formData.studentNumber.trim() : null,
              year_level: formData.role === 'student' ? formData.yearLevel : null,
              student_id: formData.role === 'parent' ? formData.studentId.trim() : null,
              is_active: true
            });
            console.log('Profile created manually as fallback');
          } catch (profileError) {
            console.log('Manual profile creation failed (may already exist):', profileError.message);
          }

          // Create welcome notification
          try {
            await supabase.from('notifications').insert({
              user_id: data.user.id,
              title: 'Welcome to Comadronas System!',
              message: `Welcome ${formData.fullName}! Your account has been created successfully. ${
                formData.role === 'student' 
                  ? 'You can now book your duty schedules.' 
                  : formData.role === 'admin'
                  ? 'You have full system access for managing schedules.'
                  : 'You can now view your child\'s duty history.'
              }`,
              type: 'success'
            });
          } catch (notificationError) {
            console.warn('Failed to create welcome notification:', notificationError);
          }

          if (data.user.email_confirmed_at) {
            setSuccess('Registration successful! You can now log in.');
          } else {
            setSuccess('Registration successful! Please check your email to verify your account before logging in.');
          }
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.message;
      
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = 'Please check your email and click the confirmation link before logging in.';
      } else if (error.message.includes('User already registered')) {
        errorMessage = 'An account with this email already exists. Please try logging in instead.';
      } else if (error.message.includes('Password should be at least 6 characters')) {
        errorMessage = 'Password must be at least 6 characters long.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (role) => {
    const credentials = {
      admin: { email: 'admin@iscc.edu', password: 'admin123' },
      student: { email: 'student@iscc.edu', password: 'student123' },
      parent: { email: 'parent@iscc.edu', password: 'parent123' }
    };
    
    setFormData({
      ...formData,
      email: credentials[role].email,
      password: credentials[role].password
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mx-auto mb-4 shadow-xl">
            <img 
              src="/image0.png" 
              alt="ISCC Midwifery Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Kumadronas System
          </h1>
          <p className="text-gray-600 text-lg">
            Ilocos Sur Community College
          </p>
          <p className="text-gray-500 text-sm mt-1">
            On-Call Duty Scheduling System
          </p>
        </div>

        {/* Auth Form */}
        <div className="glass-card p-8 animate-slide-up">
          {/* Login/Register Toggle */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                isLogin
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              <LogIn className="w-4 h-4 inline-block mr-2" />
              Login
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
                setSuccess('');
              }}
              className={`flex-1 py-3 px-4 rounded-md font-medium transition-all duration-200 ${
                !isLogin
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-700'
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-2" />
              Register
            </button>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  className="input-field"
                  placeholder="your.email@iscc.edu"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                  className="input-field pr-10"
                  placeholder="Enter your password"
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Registration fields */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Juan Dela Cruz"
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'student', label: 'Student', icon: GraduationCap },
                    
                      { value: 'parent', label: 'Parent', icon: Users }
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: value })}
                        className={`p-3 rounded-lg border transition-all duration-200 ${
                          formData.role === value
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student Number
                      </label>
                      <input
                        type="text"
                        name="studentNumber"
                        value={formData.studentNumber}
                        onChange={handleChange}
                        className="input-field"
                        placeholder="2024-12345"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year Level
                      </label>
                      <select
                        name="yearLevel"
                        value={formData.yearLevel}
                        onChange={handleChange}
                        className="input-field"
                        required
                      >
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </>
                )}

                {formData.role === 'parent' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Child's Student ID
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter your child's student ID"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="09123456789"
                    autoComplete="tel"
                  />
                </div>
              </>
            )}

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed py-3 text-lg font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </div>
              ) : (
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              )}
            </button>
          </div>

          
          

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              {isLogin 
                ? "Don't have an account? " 
                : "Already have an account? "
              }
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setSuccess('');
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {isLogin ? 'Register here' : 'Sign in here'}
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Secure system for ISCC midwifery students
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-600">Secure Access</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs text-gray-600">Student Focused</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-xs text-gray-600">Transparent</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;