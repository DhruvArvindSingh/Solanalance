import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { useNavigate } from 'react-router-dom';

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userRole: null,
  loading: true,
  signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<{ user: User } | null>(null);
  const [userRole, setUserRole] = useState<'recruiter' | 'freelancer' | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      if (token) {
        apiClient.setToken(token);
        const { data, error } = await apiClient.auth.getUser();

        if (data && !error) {
          const userData = {
            id: data.id,
            email: data.email,
            fullName: data.fullName,
            avatarUrl: data.avatarUrl,
            bio: data.bio
          };

          setUser(userData);
          setSession({ user: userData });
          setUserRole(data.role);
        } else {
          // Invalid token
          localStorage.removeItem('token');
          apiClient.setToken(null);
          setUser(null);
          setSession(null);
          setUserRole(null);
        }
      } else {
        setUser(null);
        setSession(null);
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
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

  return (
    <AuthContext.Provider value={{ user, session, userRole, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
