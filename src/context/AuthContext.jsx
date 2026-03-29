// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

// -----------------------------
// Context shape & helpers
// -----------------------------
const AuthContext = createContext({
  fbUser: null,          // Firebase Auth user
  profile: null,         // Firestore /users/{uid} doc
  loading: true,         // true while resolving user + profile
  signInWithGoogle: async () => { },
  signInWithEmail: async () => { },
  signUpWithEmail: async () => { },
  logout: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

// Check if user exists by email (for Google Login)
async function findUserByEmail(email) {
  if (!email) return null;
  const q = query(collection(db, "users"), where("email", "==", email));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// -----------------------------
// Provider
// -----------------------------
export function AuthProvider({ children }) {
  const [fbUser, setFbUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep a live subscription to /users/{uid} when signed in
  useEffect(() => {
    let unsub = null;
    const off = onAuthStateChanged(auth, async (u) => {
      setFbUser(u || null);
      if (!u) {
        // signed out
        if (unsub) unsub();
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Live snapshot
        unsub = onSnapshot(doc(db, "users", u.uid), (ss) => {
          if (ss.exists()) {
            setProfile({ ...ss.data(), uid: u.uid });
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setProfile(null);
          setLoading(false);
        });
      } catch (e) {
        console.error("Auth bootstrap error:", e);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => {
      off();
      if (unsub) unsub();
    };
  }, []);

  // -----------------------------
  // Auth actions
  // -----------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const u = res.user;

    // Validate that user exists in Firestore
    const existing = await findUserByEmail(u.email);
    if (!existing) {
      await signOut(auth);
      throw new Error("Your email is not registered in the system. Please contact your administrator.");
    }
    
    // Ensure doc exists by UID if it only existed by email (manual admin entry)
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
       await setDoc(userRef, {
         ...existing,
         uid: u.uid,
         lastLogin: serverTimestamp(),
       }, { merge: true });
    }

    return u;
  };

  const signInWithEmail = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    return res.user;
  };

  const signUpWithEmail = async (email, password, displayName) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(res.user, { displayName });
    }
    await setDoc(doc(db, "users", res.user.uid), {
      email,
      displayName,
      createdAt: serverTimestamp(),
      role: "student", 
      verified: false,
    });
    return res.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    const u = auth.currentUser;
    if (!u) return null;
    const snap = await getDoc(doc(db, "users", u.uid));
    if (snap.exists()) {
      setProfile({ ...snap.data(), uid: u.uid });
      return snap.data();
    }
    return null;
  };

  const value = useMemo(
    () => ({
      fbUser,
      profile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      logout,
      refreshProfile,
    }),
    [fbUser, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
