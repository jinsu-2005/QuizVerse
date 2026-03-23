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

// Ensure a Firestore profile doc exists for the user
async function ensureUserDoc(user) {
  if (!user) return null;
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const payload = {
      // minimal defaults; student can complete in RoleGate
      role: null, // "student" | "teacher" after onboarding
      name: user.displayName || null,
      displayName: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
      averageScore: 0,
      totalQuizzes: 0,
    };
    await setDoc(ref, payload, { merge: true });
    return payload;
  }
  return snap.data();
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
        await ensureUserDoc(u);
        // live snapshot
        unsub = onSnapshot(doc(db, "users", u.uid), (ss) => {
          setProfile(ss.exists() ? { ...ss.data(), uid: u.uid } : null);
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
    // ensure profile exists (just in case)
    await ensureUserDoc(res.user);
    return res.user;
  };

  const signInWithEmail = async (email, password) => {
    const res = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDoc(res.user);
    return res.user;
  };

  const signUpWithEmail = async (email, password, displayName) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(res.user, { displayName });
    }
    await ensureUserDoc(res.user);
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
