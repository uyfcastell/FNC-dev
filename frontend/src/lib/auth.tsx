import { Box, CircularProgress } from "@mui/material";
import { PropsWithChildren, ReactNode, createContext, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  User,
  fetchCurrentUser,
  fetchRolePermissions,
  loginWithCredentials,
  loginWithPin as loginWithPinRequest,
  setStoredToken,
  getStoredToken,
} from "./api";
import { getDeviceProfile } from "./device";
import { ForbiddenPage } from "../pages/ForbiddenPage";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  can: (perm: string) => boolean;
  canAny: (perms: string[]) => boolean;
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

  const enrichUserPermissions = async (profile: User): Promise<User> => {
    const currentPermissions = profile.permissions ?? [];
    if (currentPermissions.length > 0 || !profile.role_id) {
      return { ...profile, permissions: currentPermissions };
    }
    const rolePermissions = await fetchRolePermissions(profile.role_id);
    return { ...profile, permissions: rolePermissions };
  };

  const loadProfile = async () => {
    try {
      const profile = await fetchCurrentUser();
      const profileWithPermissions = await enrichUserPermissions(profile);
      setUser(profileWithPermissions);
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
        const userWithPermissions = await enrichUserPermissions(response.user);
        setUser(userWithPermissions);
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
        const userWithPermissions = await enrichUserPermissions(response.user);
        setUser(userWithPermissions);
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

  const userPermissionSet = new Set((user?.permissions ?? []).map((permission) => permission.toLowerCase()));
  const can = (perm: string) => userPermissionSet.has(perm.toLowerCase());
  const canAny = (perms: string[]) => perms.some((perm) => userPermissionSet.has(perm.toLowerCase()));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        can,
        canAny,
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

export function RequirePermission({ anyOf, children }: { anyOf: string[]; children: ReactNode }) {
  const { user, loading, canAny } = useAuth();
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

  if (!anyOf.length || !canAny(anyOf)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
