import { createContext, useContext, useMemo, useState } from "react";
import { loginUser, registerUser } from "../services/authApi";

const TOKEN_KEY = "bus_booking_token";
const USER_KEY = "bus_booking_user";

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  const cleanedRole = String(role || "").toUpperCase();
  return cleanedRole === "ADMIN" ? "ADMIN" : "USER";
}

function normalizeUser(user) {
  if (!user || typeof user !== "object") {
    return { role: "USER" };
  }

  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) {
    return true;
  }

  return payload.exp * 1000 < Date.now();
}

function getStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const storedUser = localStorage.getItem(USER_KEY);

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }

  try {
    const parsed = storedUser ? JSON.parse(storedUser) : decodeJwt(token);
    return { token, user: normalizeUser(parsed) };
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return { token: null, user: null };
  }
}

function extractToken(data) {
  return data?.token || data?.jwt || data?.accessToken || null;
}

function extractUser(data, token) {
  const responseUser =
    data?.user && typeof data.user === "object" ? data.user : {};

  const profile =
    data?.profile && typeof data.profile === "object" ? data.profile : {};

  const jwtPayload = decodeJwt(token) || {};

  return normalizeUser({
    ...jwtPayload,
    ...profile,
    ...responseUser,
    role: data?.role || profile.role || responseUser.role || jwtPayload.role,
  });
}

export function AuthProvider({ children }) {
  const initialAuth = getStoredAuth();
  const [token, setToken] = useState(initialAuth.token);
  const [user, setUser] = useState(initialAuth.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isAuthenticated = Boolean(token && !isTokenExpired(token));

  async function login(formData) {
    setLoading(true);
    setError("");

    try {
      const data = await loginUser(formData);
      const nextToken = extractToken(data);

      if (!nextToken) {
        setError("Login failed: token not returned by API");
        return { ok: false, user: null };
      }

      const profile = extractUser(data, nextToken);
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));

      setToken(nextToken);
      setUser(profile);
      return { ok: true, user: profile };
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
      return { ok: false, user: null };
    } finally {
      setLoading(false);
    }
  }

  async function register(formData) {
    setLoading(true);
    setError("");

    try {
      const data = await registerUser({
        fullName: formData.fullName || formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: formData.role,
      });

      const nextToken = extractToken(data);

      if (!nextToken) {
        setError("Registration succeeded, but token was not returned");
        return { ok: false, user: null };
      }

      const profile = extractUser(data, nextToken);
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));

      setToken(nextToken);
      setUser(profile);
      return { ok: true, user: profile };
    } catch (err) {
      setError(err.response?.data?.message || "Unable to register user");
      return { ok: false, user: null };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setError("");
  }

  const value = useMemo(
    () => ({
      user,
      token,
      error,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
    }),
    [user, token, error, loading, isAuthenticated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
