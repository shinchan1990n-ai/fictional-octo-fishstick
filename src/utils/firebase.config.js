import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase.auth.js";

export const signUpWithEmail = async (email, password) => {
  try {
    console.log("email : ", email);
    console.log("password : ", password);
    console.log("sign up with email request started : ", email, password, auth);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("User signed up:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("Sign up error:", error.message);
    throw error;
  }
};

export const loginWithEmail = async (email, password) => {
  try {
    console.log("email : ", email);
    console.log("password : ", password);
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("user credentials : ", userCredential);
    return userCredential.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    console.log("Initiating Google login...");
    const result = await signInWithPopup(auth, googleProvider);
    console.log("Google login successful:", result.user);
    return result.user;
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    const response = await signOut(auth);
    console.log("User logged out:", response);
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

export const onAuthChange = (callback) => {
  console.log("Setting up auth state listener...");
  console.log("Auth object:", auth);
  return onAuthStateChanged(auth, callback);
};
