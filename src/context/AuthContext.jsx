// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

const USER_KEY = "driver_data";
const TOKEN_KEY = "driver_token";

export const AuthProvider = ({ children }) => {
  // admin object: { adminId, name, id, token }
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null); // string
  const [loading, setLoading] = useState(true);

  // hydrate from localStorage (persisted login)
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    const savedToken = localStorage.getItem(TOKEN_KEY);

    if (savedUser) {
      try {
        setAdmin(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing saved admin data", e);
        localStorage.removeItem(USER_KEY);
      }
    }

    if (savedToken) {
      setToken(savedToken);
    }

    setLoading(false);
  }, []);

  const setLoginData = (adminData) => {
    setAdmin(adminData);
    setToken(adminData?.token || null);

    localStorage.setItem(USER_KEY, JSON.stringify(adminData));
    if (adminData?.token) {
      localStorage.setItem(TOKEN_KEY, adminData.token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const isLoggedIn = Boolean(admin && token);

  return (
    <AuthContext.Provider
      value={{ admin, token, setLoginData, logout, isLoggedIn, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
