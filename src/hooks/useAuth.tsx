import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, userEmail?: string) => {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching profile for user: ${userId}, attempt: ${attempt}/${maxRetries}`);
        
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log('Profile not found for user:', userId);
            
            // If this is not the last attempt, wait and retry
            if (attempt < maxRetries) {
              console.log(`Retrying profile fetch in 1 second... (attempt ${attempt + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue; // Continue to next iteration
            }
            
            // After all retries, profile still doesn't exist - try to create it
            console.log('Profile missing after all retries - attempting to create profile');
            if (userEmail) {
              try {
                // First, verify the user exists in auth.users (they should since we have a session)
                console.log('Verifying user exists in auth.users table...');
                
                const isAdmin = userEmail === 'devzoratech@gmail.com';
                console.log(`Creating profile for ${userEmail} with role: ${isAdmin ? 'admin' : 'user'}`);
                
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    user_id: userId,
                    email: userEmail,
                    full_name: isAdmin ? 'Admin User' : 'User',
                    role: isAdmin ? 'admin' : 'user'
                  })
                  .select()
                  .single();
                
                if (createError) {
                  console.error('Failed to create profile:', createError);
                  console.error('Create error details:', {
                    code: createError.code,
                    message: createError.message,
                    details: createError.details,
                    hint: createError.hint
                  });
                  
                  // If it's a unique constraint violation, the profile might have been created by another process
                  if (createError.code === '23505') {
                    console.log('Profile already exists (created by another process), retrying fetch...');
                    // Try to fetch the profile one more time
                    const { data: existingProfile, error: fetchError } = await supabase
                      .from('profiles')
                      .select('*')
                      .eq('user_id', userId)
                      .single();
                    
                    if (!fetchError && existingProfile) {
                      console.log('Found existing profile:', existingProfile);
                      setProfile(existingProfile);
                    } else {
                      console.error('Still cannot find profile after creation attempt');
                      setProfile(null);
                    }
                  } else {
                    setProfile(null);
                  }
                } else {
                  console.log('Profile created successfully:', newProfile);
                  setProfile(newProfile);
                }
              } catch (createErr) {
                console.error('Error creating profile:', createErr);
                setProfile(null);
              }
            } else {
              console.log('No user email available - cannot create profile');
              setProfile(null);
            }
            setIsLoading(false);
            return;
          }
          throw error;
        }
        
        // Success - profile found
        console.log('Profile fetched successfully:', profile);
        setProfile(profile);
        setIsLoading(false);
        return;
        
      } catch (error) {
        console.error(`Error fetching profile (attempt ${attempt}/${maxRetries}):`, error);
        
        // If this is not the last attempt, wait and retry
        if (attempt < maxRetries) {
          console.log(`Retrying profile fetch due to error... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue; // Continue to next iteration
        }
        
        // After all retries, still failing
        console.log('Profile fetch failed after all retries - continuing without profile');
        setProfile(null);
        setIsLoading(false);
        return;
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialized = false;

    const handleAuthState = async (event: string, session: Session | null) => {
      if (!mounted) return;
      
      console.log('Handling auth state:', event, session?.user?.email);
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Don't set loading to false yet - wait for profile fetch to complete
        await fetchProfile(session.user.id, session.user.email);
      } else {
        setProfile(null);
        // Only set loading to false when there's no user
        setIsLoading(false);
      }
    };

    // Initialize auth state immediately on mount
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        console.log('Initial session:', session?.user?.email || 'No session');
        
        if (mounted) {
          initialized = true;
          await handleAuthState('INITIAL_SESSION', session);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('onAuthStateChange fired:', event, session?.user?.email);
        
        // Only handle auth changes after initial setup, or if initialization failed
        if (initialized || event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          await handleAuthState(event, session);
        }
      }
    );

    // Initialize immediately
    initializeAuth();

    // Add a timeout to ensure loading state is cleared even if auth fails
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Auth timeout - setting loading to false');
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout (increased for slower connections)

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array - fetchProfile is stable with useCallback
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    signOut,
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