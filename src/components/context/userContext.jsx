// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../../utils/firebase.auth.js";
import { onAuthStateChanged } from "firebase/auth/web-extension";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState({ email: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    // This is the "Session Listener"
    const unsubscribe = onAuthStateChanged(auth, (loggedInUser) => {
      if (loggedInUser) {
        // User is signed in, update your context state
        setLoggedInUser({
          email: loggedInUser.email,
          uid: loggedInUser.uid,
        });
      } else {
        // User is signed out
        setLoggedInUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

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
