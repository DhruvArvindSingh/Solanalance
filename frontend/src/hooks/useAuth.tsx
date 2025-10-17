import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  session: { user: User } | null;
  userRole: 'recruiter' | 'freelancer' | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  loading: true,
  signOut: async () => { },
  refreshAuth: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [userRole, setUserRole] = useState<'recruiter' | 'freelancer' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Re-check authentication when route changes (e.g., after sign-in redirect)
  // Only do this if we're navigating to protected routes and don't have user data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user && !loading && location.pathname !== '/auth') {
      console.log('Route changed to protected page, re-checking authentication');
      checkAuthStatus();
    }
  }, [location.pathname, user, loading]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (token) {
        // Set token in API client
        apiClient.setToken(token);

        // Validate token with backend
        const { data, error } = await apiClient.auth.getUser();

        if (data && !error) {
          console.log('Auth check successful:', data);
          const userData = {
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            bio: data.bio
          };

          setUser(userData);
          setSession({ user: userData });
          setUserRole(data.role || 'freelancer');
        } else {
          console.log('Auth check failed, clearing session');
          // Invalid token - clear everything
          localStorage.removeItem('token');
          apiClient.setToken(null);
          setUser(null);
          setSession(null);
          setUserRole(null);
        }
      } else {
        console.log('No token found, user not authenticated');
        setUser(null);
        setSession(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On network error, clear session to be safe
      localStorage.removeItem('token');
      apiClient.setToken(null);
      setUser(null);
      setSession(null);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await apiClient.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/');
  };

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
