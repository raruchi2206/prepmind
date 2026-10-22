import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi, userApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // The API client silently refreshes an expired access token before this fails
  const refreshUser = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data.user);
      return response.data.user;
    } catch {
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
    // Refresh token expired or revoked: drop the session so ProtectedRoute redirects to login
    const handleExpired = () => setUser(null);
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login: async (credentials) => {
        const response = await authApi.login(credentials);
        setUser(response.data.user);
        return response.data.user;
      },
      register: async (input) => {
        const response = await authApi.register(input);
        return response.data?.user;
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setUser(null);
        }
      },
      refreshUser,
      updateProfile: async (input) => {
        const response = await userApi.updateProfile(input);
        setUser(response.data.user);
        return response.data.user;
      },
      changePassword: async (input) => {
        return authApi.changePassword(input);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
