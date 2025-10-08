import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import AuthForm from './components/AuthForm';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [showLanding, setShowLanding] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Robust profile fetcher that doesn't block UI
  const fetchUserProfile = useCallback(async (userId) => {
    if (!userId) return;

    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
        return;
      }

      if (data) {
        console.log('Profile loaded:', data.full_name, data.role);
        setUser(data);
        
        // Update last login (non-blocking)
        supabase
          .from('profiles')
          .update({ last_login: new Date().toISOString() })
          .eq('id', userId)
          .catch(err => console.warn('Failed to update last login:', err));
      } else {
        // Profile doesn't exist, create it
        console.log('Profile not found, creating new profile...');
        await createProfileFromAuth(userId);
      }
        
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Don't set error - just continue with session data
    }
  }, []);

  const createProfileFromAuth = async (userId) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) return;

      const metadata = authUser.user_metadata || {};
      
      const profileData = {
        id: userId,
        email: authUser.email,
        full_name: metadata.full_name || authUser.email.split('@')[0],
        role: metadata.role || 'student',
        phone_number: metadata.phone_number || null,
        student_number: metadata.student_number || null,
        year_level: metadata.year_level || null,
        is_active: true
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Profile already exists, fetch it
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();
          
          if (existingProfile) {
            setUser(existingProfile);
            return;
          }
        }
        console.error('Error creating profile:', error);
        return;
      }

      console.log('Profile created successfully:', data.full_name);
      setUser(data);
      
      // Create welcome notification (non-blocking)
      supabase.from('notifications').insert({
        user_id: data.id,
        title: 'Welcome to Comadronas System!',
        message: `Welcome ${data.full_name}! Your account has been created successfully.`,
        type: 'success'
      }).catch(err => console.warn('Failed to send welcome notification:', err));
      
    } catch (error) {
      console.error('Error creating profile:', error);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('Checking for existing session...');
        
        // Get session immediately - don't wait
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          if (isMounted) {
            setShowLanding(true);
            setInitialized(true);
          }
          return;
        }

        if (!isMounted) return;

        if (session?.user) {
          console.log('Found existing session for:', session.user.email);
          setSession(session);
          setShowLanding(false);
          setInitialized(true);
          
          // Create basic user immediately so dashboard can render
          const basicUser = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.email.split('@')[0],
            role: 'student',
            is_active: true
          };
          setUser(basicUser);
          
          // Then fetch full profile in background
          fetchUserProfile(session.user.id);
        } else {
          console.log('No existing session found');
          setShowLanding(true);
          setInitialized(true);
        }
        
      } catch (error) {
        console.error('Initialization error:', error);
        if (isMounted) {
          setShowLanding(true);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email);
        setSession(session);
        setError(null);
        setShowLanding(false);
        
        // Immediately create basic user object
        const basicUser = {
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.email.split('@')[0],
          role: 'student',
          is_active: true
        };
        setUser(basicUser);
        
        // Fetch full profile in background
        fetchUserProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
        setSession(null);
        setUser(null);
        setError(null);
        setShowLanding(true);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed');
        setSession(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const handleProfileUpdate = useCallback((updatedUser) => {
    console.log('Profile updated:', updatedUser.full_name);
    setUser(updatedUser);
  }, []);

  const handleGetStarted = useCallback(() => {
    setShowLanding(false);
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    if (session?.user) {
      fetchUserProfile(session.user.id);
    } else {
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        if (error) {
          setError(error.message);
          return;
        }
        
        if (session) {
          setSession(session);
          const basicUser = {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.email.split('@')[0],
            role: 'student',
            is_active: true
          };
          setUser(basicUser);
          fetchUserProfile(session.user.id);
        } else {
          setShowLanding(true);
        }
      });
    }
  }, [session, fetchUserProfile]);

  // Show error screen only if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRetry}
                className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => {
                  supabase.auth.signOut().then(() => {
                    window.location.reload();
                  });
                }}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show anything until we've checked for session
  if (!initialized) {
    return null;
  }

  // Show landing page
  if (showLanding && !session) {
    return <LandingPage onGetStarted={handleGetStarted} />;
  }

  // Show auth form
  if (!session) {
    return <AuthForm />;
  }

  // Show dashboard immediately if we have session and user (even if basic)
  if (session && user) {
    return (
      <Dashboard 
        user={user} 
        session={session} 
        onProfileUpdate={handleProfileUpdate}
      />
    );
  }

  // Fallback to auth form
  return <AuthForm />;
}

export default App;