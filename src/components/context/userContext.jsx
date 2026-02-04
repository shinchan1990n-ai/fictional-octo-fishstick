// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState({ email: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");
  const value = {
    loggedInUser: loggedInUser,
    setLoggedInUser: setLoggedInUser,
    loading: loading,
    setLoading: setLoading,
    error: error,
    setError: setError,
    email: email,
    setEmail: setEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
