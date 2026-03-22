import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInAnonymously,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, db } from "../firebase"; // <- adjust path if needed
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";

/**
 * Advanced, modern SignIn/SignUp page (JS only, Tailwind-ready)
 * - Login / SignUp tabs
 * - Email+Password, Google, GitHub, Guest
 * - Saves user doc on first sign-up or first social login
 * - Password strength meter + show/hide toggle
 * - Forgot password flow
 * - Redirects back after login
 *
 * Works with your App.js routing/auth patterns.  :contentReference[oaicite:1]{index=1}
 */

const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

export default function SignIn() {
  const nav = useNavigate();

  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [acceptTos, setAcceptTos] = useState(true);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const pwdStrength = useMemo(() => {
    // very simple heuristic for demo
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // 0..4
  }, [password]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToast({ type: "", msg: "" });

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        setToast({ type: "success", msg: "Welcome back 👋" });
      } else {
        if (!acceptTos) {
          throw new Error("Please accept the Terms to create your account.");
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const u = cred.user;
        const userRef = doc(db, "users", u.uid);
        await setDoc(userRef, {
          email: u.email,
          displayName: u.email?.split("@")[0],
          photoURL: "",
          createdAt: serverTimestamp(),
          totalQuizzes: 0,
          averageScore: 0,
          // role will be chosen later in RoleGate (Student/Teacher)
        });
        setToast({ type: "success", msg: "Account created 🎉" });
      }
      nav("/"); // your App sends them to RoleGate or dashboard
    } catch (err) {
      setToast({ type: "error", msg: cleanFirebaseMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const socialLogin = async (provider) => {
    setBusy(true);
    setToast({ type: "", msg: "" });
    try {
      const { user } = await signInWithPopup(auth, provider);
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          photoURL: user.photoURL || "",
          createdAt: serverTimestamp(),
          totalQuizzes: 0,
          averageScore: 0,
        });
      } else {
        // Don’t clobber photoURL; optionally refresh displayName if different
        const existing = snap.data();
        if (user.displayName && user.displayName !== existing.displayName) {
          await updateDoc(userRef, { displayName: user.displayName });
        }
      }
      setToast({ type: "success", msg: "Signed in successfully ✅" });
      nav("/");
    } catch (err) {
      setToast({ type: "error", msg: cleanFirebaseMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const guestLogin = async () => {
    setBusy(true);
    setToast({ type: "", msg: "" });
    try {
      await signInAnonymously(auth);
      setToast({ type: "success", msg: "Continuing as guest 👤" });
      nav("/");
    } catch (err) {
      setToast({ type: "error", msg: cleanFirebaseMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    if (!email) {
      setToast({ type: "error", msg: "Enter your email first." });
      return;
    }
    setBusy(true);
    setToast({ type: "", msg: "" });
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setToast({ type: "success", msg: "Password reset link sent ✉️" });
    } catch (err) {
      setToast({ type: "error", msg: cleanFirebaseMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const strengthBar = () => {
    const color =
      pwdStrength <= 1 ? "bg-red-500" : pwdStrength === 2 ? "bg-yellow-500" : "bg-green-500";
    const width = `${(pwdStrength / 4) * 100}%`;
    return (
      <div className="h-1.5 bg-gray-700 rounded mt-2 overflow-hidden">
        <div className={`h-1.5 ${color} transition-all`} style={{ width }} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />

        {/* Brand */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 grid place-items-center font-bold">Q</div>
          <h1 className="text-3xl sm:text-4xl font-extrabold ml-3">QuizVerse</h1>
        </div>
        <p className="text-center text-gray-400 mb-6">
          {mode === "login" ? "Welcome back—log in to continue." : "Create your account to get started."}
        </p>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-gray-800 rounded-lg p-1 mb-6">
          <button
            className={`py-2 rounded-md font-semibold transition ${mode === "login" ? "bg-blue-600" : "text-gray-400 hover:text-white"}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`py-2 rounded-md font-semibold transition ${mode === "signup" ? "bg-blue-600" : "text-gray-400 hover:text-white"}`}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg pr-12 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                aria-label="Show password"
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
            {mode === "signup" && strengthBar()}
            {mode === "login" && (
              <div className="text-right mt-1">
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {mode === "signup" && (
            <label className="flex items-start gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptTos}
                onChange={(e) => setAcceptTos(e.target.checked)}
              />
              <span>
                I agree to the <span className="text-blue-400">Terms</span> &{" "}
                <span className="text-blue-400">Privacy Policy</span>.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold transition disabled:bg-gray-600"
          >
            {busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-900 px-3 text-gray-400 text-sm">OR</span>
          </div>
        </div>

        {/* Social buttons */}
        <div className="space-y-3">
          <button
            onClick={() => socialLogin(googleProvider)}
            disabled={busy}
            className="w-full h-11 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.048 36.453 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => socialLogin(githubProvider)}
            disabled={busy}
            className="w-full h-11 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Continue with GitHub
          </button>

          <button
            onClick={guestLogin}
            disabled={busy}
            className="w-full h-11 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700"
          >
            Continue as Guest
          </button>
        </div>

        {/* Tiny footer */}
        <p className="text-center text-gray-400 mt-6 text-sm">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-semibold text-blue-400 hover:text-blue-300"
          >
            {mode === "login" ? "Sign Up" : "Login"}
          </button>
        </p>

        {/* Toast */}
        {toast.msg && (
          <div
            className={`fixed top-6 right-4 px-4 py-3 rounded-lg shadow-lg text-sm ${
              toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Reset hint */}
        {resetSent && (
          <p className="text-xs text-green-400 text-center mt-3">
            Check your inbox for the reset link.
          </p>
        )}
      </div>
    </div>
  );
}

function cleanFirebaseMsg(m) {
  return (m || "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/\(auth\/[^\)]+\)/i, "")
    .trim();
}
