import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { jwtDecode } from "jwt-decode";

/**
 * Client-side session, ported from eventsh-v1's frontend/src/hooks/useAuth.tsx
 * conventions: the Backend-issued JWT lives in sessionStorage, decoded with
 * jwt-decode, expiry checked manually. Login calls the Backend's
 * POST /auth/login directly — the Next app's jose-signed httpOnly cookie layer
 * was Next-specific indirection and is deliberately not re-created here.
 */
export interface User {
  sub: string;
  email: string;
  name: string;
  role: string;
  /** Operator only — the main-sidebar keys this account may see. */
  tabs?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** Performs the login POST against __API_URL__/auth/login. */
  loginWithToken: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "token";

function decodeUser(token: string): User | null {
  try {
    const decoded = jwtDecode<{ sub: string; email: string; name: string; role: string; exp: number; tabs?: string[] }>(
      token,
    );
    if (decoded.exp && decoded.exp < Date.now() / 1000) return null;
    return { sub: decoded.sub, email: decoded.email, name: decoded.name, role: decoded.role, tabs: decoded.tabs };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applyToken = useCallback((token: string) => {
    const decoded = decodeUser(token);
    if (!decoded) {
      sessionStorage.removeItem(TOKEN_KEY);
      setUser(null);
      return false;
    }
    sessionStorage.setItem(TOKEN_KEY, token);
    setUser(decoded);
    return true;
  }, []);

  useEffect(() => {
    // ?token= bootstrap (OAuth-style redirects, deep links) — read once, then
    // strip from the URL so it never leaks into history or logs.
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get("token");
    if (queryToken) {
      if (applyToken(queryToken)) {
        params.delete("token");
        const rest = params.toString();
        window.history.replaceState(
          null,
          "",
          window.location.pathname + (rest ? `?${rest}` : ""),
        );
      }
    }
    const stored = sessionStorage.getItem(TOKEN_KEY);
    if (stored) applyToken(stored);
    setLoading(false);
  }, [applyToken]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken: applyToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
