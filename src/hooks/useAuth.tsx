import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session, AuthError, PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  access_level?: 'full' | 'restricted' | 'banned';
}

interface UserMetadata {
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isSigningOut: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ data: { user: User; session: Session } | null; error: AuthError | null } | { data: null; error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Utility function to safely handle Supabase errors
const handleSupabaseError = (error: PostgrestError | AuthError | null, operation: string): boolean => {
  if (!error) return true;
  
  console.error(`${operation} failed:`, {
    code: error.code,
    message: error.message,
    details: (error as { details?: string }).details,
    hint: (error as { hint?: string }).hint
  });
  
  return false;
};

// Utility function to wait with timeout
const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const createProfile = useCallback(async (userId: string, email: string, fullName?: string): Promise<Profile | null> => {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const normalizedEmail = email.toLowerCase();
        const isAdmin = normalizedEmail === 'devzoratech@gmail.com';
        const displayName = fullName?.trim() || (isAdmin ? 'Admin User' : 'User');

        console.log(`Creating profile for ${normalizedEmail} with role ${isAdmin ? 'admin' : 'user'} (attempt ${attempt}/${maxRetries})`);

        const { data, error } = await supabase
          .from('profiles')
          .insert({
            user_id: userId,
            email: normalizedEmail,
            full_name: displayName,
            role: isAdmin ? 'admin' : 'user'
          })
          .select()
          .single();

        if (handleSupabaseError(error, 'Profile creation')) {
          console.log('Profile created successfully:', data);
          return data;
        }

        // If it's a unique constraint violation, profile might already exist
        if (error?.code === '23505') {
          console.log('Profile already exists (race condition), attempting to fetch...');
          const existingProfile = await fetchProfile(userId);
          if (existingProfile) return existingProfile;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await wait(waitTime);
        }
      } catch (error) {
        console.error(`Profile creation attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await wait(1000);
        }
      }
    }
    
    console.error('Profile creation failed after all retries');
    return null;
  }, []);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching profile for user ${userId} (attempt ${attempt}/${maxRetries})`);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (!error && data) {
          console.log('Profile fetched successfully:', data);
          return data;
        }

        if (error?.code === 'PGRST116') {
          console.log('Profile not found (PGRST116)');
          return null;
        }

        // Handle other errors
        if (!handleSupabaseError(error, 'Profile fetch')) {
          // Wait before retry
          if (attempt < maxRetries) {
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
            console.log(`Waiting ${waitTime}ms before retry...`);
            await wait(waitTime);
          }
        }
      } catch (error) {
        console.error(`Profile fetch attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          await wait(1000);
        }
      }
    }
    
    console.error('Profile fetch failed after all retries');
    return null;
  }, []);

  const ensureProfile = useCallback(async (user: User): Promise<Profile | null> => {
    try {
      // Validate user data
      if (!user.id || !user.email) {
        console.error('Invalid user data:', { id: user.id, email: user.email });
        return null;
      }

      console.log('Ensuring profile exists for user:', user.email);
      
      // First try to fetch existing profile
      let profile = await fetchProfile(user.id);
      
      if (profile) {
        console.log('Existing profile found:', profile);
        return profile;
      }

      // Profile doesn't exist, create it
      console.log('No existing profile, creating new one...');
      profile = await createProfile(user.id, user.email, (user.user_metadata as UserMetadata)?.full_name);
      
      if (profile) {
        console.log('Profile ensured successfully:', profile);
      } else {
        console.error('Failed to ensure profile for user:', user.email);
      }
      
      return profile;
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      return null;
    }
  }, [fetchProfile, createProfile]);

  const handleAuthStateChange = useCallback(async (event: string, session: Session | null) => {
    try {
      console.log('Auth state change:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setIsLoading(true);
        setRetryCount(0);
        
        const userProfile = await ensureProfile(session.user);
        
        if (userProfile) {
          setProfile(userProfile);
          console.log('Auth state change completed successfully');
        } else {
          console.error('Failed to ensure profile, setting profile to null');
          setProfile(null);
        }
        
        setIsLoading(false);
      } else {
        setProfile(null);
        setIsLoading(false);
        console.log('User signed out, auth state cleared');
      }
    } catch (error) {
      console.error('Error in handleAuthStateChange:', error);
      setIsLoading(false);
      setProfile(null);
    }
  }, [ensureProfile]);

  const initializeAuth = useCallback(async () => {
    try {
      console.log('Initializing auth state...');
      
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting initial session:', error);
        setIsLoading(false);
        return;
      }
      
      console.log('Initial session retrieved:', session?.user?.email || 'No session');
      
      if (session) {
        await handleAuthStateChange('INITIAL_SESSION', session);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error initializing auth:', error);
      setIsLoading(false);
    }
  }, [handleAuthStateChange]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const setupAuth = async () => {
      try {
        // Initialize auth state
        await initializeAuth();
        
        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (mounted) {
              await handleAuthStateChange(event, session);
            }
          }
        );
        
        authSubscription = subscription;
      } catch (error) {
        console.error('Error setting up auth:', error);
        if (mounted) setIsLoading(false);
      }
    };

    setupAuth();

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [initializeAuth, handleAuthStateChange]);

  // Listen for profile updates from real-time permissions
  useEffect(() => {
    const handleProfileUpdate = async (event: CustomEvent) => {
      if (!user) return;
      
      const { role, access_level, is_active, updated_at } = event.detail;
      
      // Update the profile state with new data
      setProfile(prev => prev ? {
        ...prev,
        role: role || prev.role,
        access_level: access_level || prev.access_level,
        is_active: is_active !== undefined ? is_active : prev.is_active,
        updated_at: updated_at || prev.updated_at
      } : null);
      
      console.log('Profile updated via real-time permissions:', { role, access_level, is_active });
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, [user]);

  const signOut = async () => {
    try {
      console.log('Signing out...');
      setIsSigningOut(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign out:', error);
        console.warn('Signed out locally but there was an issue with the server. Please refresh the page.');
      } else {
        console.log('Sign out completed successfully');
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Clear local state even if there's an error
      setUser(null);
      setSession(null);
      setProfile(null);
      console.warn('An error occurred during sign out, but you have been signed out locally.');
    } finally {
      setIsSigningOut(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // After successful authentication, check user access level
      if (data.user) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_active, access_level')
            .eq('user_id', data.user.id)
            .single();

          if (profileError) {
            // If columns don't exist yet, allow login (default behavior)
            console.log('Access control columns not found, allowing login with default permissions');
            return { data, error: null };
          }

          // Check if user is banned or restricted
          if (profile && 'access_level' in profile && profile.access_level === 'banned') {
            // Sign out the user immediately
            await supabase.auth.signOut();
            throw new Error('Your account has been banned from the system. Please contact an administrator for more information.');
          }

          if (profile && 'access_level' in profile && profile.access_level === 'restricted') {
            // Sign out the user immediately
            await supabase.auth.signOut();
            throw new Error('Your account access has been restricted. Please contact an administrator for more information.');
          }

          if (profile && 'is_active' in profile && profile.is_active === false) {
            // Sign out the user immediately
            await supabase.auth.signOut();
            throw new Error('Your account has been deactivated. Please contact an administrator for more information.');
          }
        } catch (accessCheckError) {
          // If access check fails, allow login (default behavior)
          console.log('Access control check failed, allowing login with default permissions');
          return { data, error: null };
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    isSigningOut,
    signOut,
    signIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}