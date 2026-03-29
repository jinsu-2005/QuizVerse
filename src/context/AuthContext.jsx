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

    const cancelCurrent = () => {
      if (unsub) { unsub(); unsub = null; }
    };

    const off = onAuthStateChanged(auth, async (u) => {
      // Always cancel the previous Firestore listener before setting up a new one.
      // Without this, switching from anonymous → real user leaves an orphaned
      // listener that can overwrite profile with null and cause repeated verify loops.
      cancelCurrent();

      setFbUser(u || null);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Skip anonymous users — they are only used as a bridge for ID lookups
      // in SignIn.jsx. We don't want their (non-existent) Firestore doc to
      // clear the profile state.
      if (u.isAnonymous) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        unsub = onSnapshot(
          doc(db, "users", u.uid),
          (ss) => {
            setProfile(ss.exists() ? { ...ss.data(), uid: u.uid } : null);
            setLoading(false);
          },
          (err) => {
            console.error("Profile snapshot error:", err);
            setProfile(null);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error("Auth bootstrap error:", e);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => { off(); cancelCurrent(); };
  }, []);

  // -----------------------------
  // Auth actions
  // -----------------------------
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const u = res.user;

    // Check the email exists in our system
    const existing = await findUserByEmail(u.email);
    if (!existing) {
      await signOut(auth);
      throw new Error("Your email is not registered in the system. Please contact your administrator.");
    }

    const googleUid = u.uid;
    const seededUid = existing.id; // Firestore doc ID (may equal googleUid if accounts are linked)

    if (seededUid && seededUid !== googleUid) {
      // UID mismatch: Firebase Auth created a SEPARATE Google-only account for this email.
      // This means the email already has an email/password account with a different UID.
      // If we proceed, we'd end up with two Firestore docs and break email/password login.
      //
      // Correct behaviour: sign out the Google user and tell them to use their password.
      await signOut(auth);
      throw new Error(
        "This account uses email/password login. Please sign in with your Register Number (or email) and password instead."
      );
    }

    // UIDs match (Firebase linked the Google provider to the existing account).
    // Just update lastLogin — no doc migration needed.
    await setDoc(doc(db, "users", googleUid), {
      lastLogin: serverTimestamp(),
    }, { merge: true });

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
