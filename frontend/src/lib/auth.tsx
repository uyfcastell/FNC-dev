import { Box, CircularProgress } from "@mui/material";
import { PropsWithChildren, ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import {
  User,
  fetchCurrentUser,
  fetchRolePermissions,
  loginWithCredentials,
  loginWithPin as loginWithPinRequest,
  setStoredToken,
  getStoredToken,
  verifyCurrentUserPin,
} from "./api";
import { getDeviceProfile } from "./device";

export type SessionUser = User & {
  legacyPermissions: string[];
  permissionKeysV2: string[];
  hasPermissionKeysV2: boolean;
};

type AuthContextValue = {
  user: SessionUser | null;
  token: string | null;
  loading: boolean;
  isSuperuser: boolean;
  pinVerified: boolean;
  hasPerm: (perm: string) => boolean;
  hasAny: (perms: string[]) => boolean;
  hasAll: (perms: string[]) => boolean;
  can: (perm: string) => boolean;
  canAny: (perms: string[]) => boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithPin: (pin: string) => Promise<void>;
  verifySessionPin: (pin: string) => Promise<void>;
  clearPinVerification: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PIN_VERIFIED_KEY = "fnc_pin_verified_until";
const PIN_VERIFIED_TTL_MS = 8 * 60 * 60 * 1000;

const readPinVerified = (): boolean => {
  const raw = localStorage.getItem(PIN_VERIFIED_KEY);
  if (!raw) return false;
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    localStorage.removeItem(PIN_VERIFIED_KEY);
    return false;
  }
  return true;
};

const writePinVerified = (value: boolean): void => {
  if (!value) {
    localStorage.removeItem(PIN_VERIFIED_KEY);
    return;
  }
  localStorage.setItem(PIN_VERIFIED_KEY, String(Date.now() + PIN_VERIFIED_TTL_MS));
};

const normalizePermissions = (permissions?: string[]) =>
  Array.from(new Set((permissions ?? []).map((permission) => permission.toLowerCase())));

const toSessionUser = (profile: User): SessionUser => {
  const legacyPermissions = normalizePermissions(profile.permissions);
  const permissionKeysV2 = normalizePermissions(profile.permission_keys_v2);
  const hasPermissionKeysV2 = Array.isArray(profile.permission_keys_v2);
  return {
    ...profile,
    permissions: legacyPermissions,
    legacyPermissions,
    permissionKeysV2,
    hasPermissionKeysV2,
  };
};

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [loading, setLoading] = useState(true);
  const [pinVerified, setPinVerified] = useState<boolean>(() => readPinVerified());

  useEffect(() => {
    const existingToken = getStoredToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }
    setToken(existingToken);
    void loadProfile();
  }, []);

  const enrichUserPermissions = async (profile: User): Promise<SessionUser> => {
    const sessionProfile = toSessionUser(profile);
    if (sessionProfile.legacyPermissions.length > 0 || !sessionProfile.role_id) {
      return sessionProfile;
    }
    const rolePermissions = await fetchRolePermissions(sessionProfile.role_id);
    return {
      ...sessionProfile,
      legacyPermissions: normalizePermissions(rolePermissions),
      permissions: normalizePermissions(rolePermissions),
    };
  };

  const loadProfile = async () => {
    try {
      const profile = await fetchCurrentUser();
      const profileWithPermissions = await enrichUserPermissions(profile);
      setUser(profileWithPermissions);
      setPinVerified(readPinVerified());
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
      writePinVerified(false);
      setPinVerified(false);
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
      writePinVerified(true);
      setPinVerified(true);
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

  const verifySessionPin = async (pin: string) => {
    await verifyCurrentUserPin(pin);
    writePinVerified(true);
    setPinVerified(true);
  };

  const clearPinVerification = () => {
    writePinVerified(false);
    setPinVerified(false);
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setToken(null);
    writePinVerified(false);
    setPinVerified(false);
  };

  const { permissionSet, isSuperuser } = useMemo(() => {
    const hasV2 = user?.hasPermissionKeysV2 ?? false;
    const sourcePermissions = hasV2 ? user?.permissionKeysV2 ?? [] : user?.legacyPermissions ?? [];
    const normalizedPermissions = sourcePermissions.map((permission) => permission.toLowerCase());
    return {
      permissionSet: new Set(normalizedPermissions),
      isSuperuser: normalizedPermissions.includes("*"),
    };
  }, [user]);

  const hasPerm = (perm: string) => isSuperuser || permissionSet.has(perm.toLowerCase());
  const hasAny = (perms: string[]) => isSuperuser || perms.some((perm) => hasPerm(perm));
  const hasAll = (perms: string[]) => isSuperuser || perms.every((perm) => hasPerm(perm));

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isSuperuser,
        pinVerified,
        hasPerm,
        hasAny,
        hasAll,
        can: hasPerm,
        canAny: hasAny,
        login,
        loginWithPin,
        verifySessionPin,
        clearPinVerification,
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
  const { user, loading, hasAny } = useAuth();
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

  if (anyOf.length > 0 && !hasAny(anyOf)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
