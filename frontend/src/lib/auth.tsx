import { Box, CircularProgress } from "@mui/material";
import { PropsWithChildren, ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { User, fetchCurrentUser, loginWithCredentials, loginWithPin as loginWithPinRequest, setStoredToken, getStoredToken } from "./api";
import { getDeviceProfile } from "./device";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }
    setToken(existingToken);
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await fetchCurrentUser();
      setUser(profile);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const response = await loginWithCredentials(username, password);
      setStoredToken(response.access_token);
      setToken(response.access_token);
      if (response.user) {
        setUser(response.user);
      } else {
        await loadProfile();
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = async (pin: string) => {
    setLoading(true);
    try {
      const response = await loginWithPinRequest(pin);
      setStoredToken(response.access_token);
      setToken(response.access_token);
      if (response.user) {
        setUser(response.user);
      } else {
        await loadProfile();
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        loginWithPin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const deviceProfile = getDeviceProfile();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    const redirectPath = deviceProfile.mode === "mobile" ? "/mobile/login-pin" : "/login";
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
