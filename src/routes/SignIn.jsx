import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext.jsx";

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

export default function SignIn() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });
  const [resetSent, setResetSent] = useState(false);

  const { signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToast({ type: "", msg: "" });
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ type: "success", msg: "Welcome back 👋" });
      nav("/");
    } catch (err) {
      setToast({ type: "error", msg: cleanFirebaseMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = async () => {
    setBusy(true);
    setToast({ type: "", msg: "" });
    try {
      await signInWithGoogle();
      setToast({ type: "success", msg: "Signed in successfully ✅" });
      nav("/");
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Login failed" });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 grid place-items-center font-bold text-3xl shadow-lg shadow-blue-500/20 mb-4 transition-transform hover:scale-110 duration-500">Q</div>
          <h1 className="text-4xl font-black tracking-tight mb-2">QuizVerse</h1>
          <p className="text-gray-400 text-center">Enter your workspace to continue learning and growing.</p>
        </div>

        {/* Social buttons - Primary */}
        <div className="space-y-4">
          <button
            onClick={handleGoogleLogin}
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-white text-gray-900 hover:bg-gray-100 font-bold transition-all flex items-center justify-center gap-3 shadow-xl hover:translate-y-[-2px] active:scale-95 disabled:opacity-50"
          >
            <svg className="w-6 h-6" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.048 36.453 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-10">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-800" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-gray-900/0 backdrop-blur-md px-4 text-gray-500 text-xs font-bold tracking-widest uppercase">Admin Portal</span>
          </div>
        </div>

        {/* Email form - Minimal for Admins */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Admin Email</label>
            <input
              type="email"
              className="w-full h-12 px-5 bg-gray-800/50 border border-gray-700/50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder:text-gray-600"
              placeholder="admin@quizverse.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <div className="flex justify-between mb-2 ml-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Security Passphrase</label>
                <button
                  type="button"
                  onClick={forgotPassword}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-wider"
                >
                  Forgot?
                </button>
            </div>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className="w-full h-12 px-5 bg-gray-800/50 border border-gray-700/50 rounded-xl pr-12 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPwd ? (
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                ) : (
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-gray-800 hover:bg-gray-700 font-bold transition shadow-lg border border-gray-700 disabled:opacity-50 mt-2"
          >
            {busy ? "Authenticating..." : "Admin Login"}
          </button>
        </form>

        {/* Toast */}
        {toast.msg && (
          <div
            className={`fixed top-6 right-4 px-5 py-3 rounded-2xl shadow-2xl text-sm font-bold animate-[fadeIn_300ms_ease] z-50 ${toast.type === "error" ? "bg-red-600 text-white" : "bg-green-600 text-white"
              }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Reset hint */}
        {resetSent && (
          <p className="text-xs text-green-400 text-center mt-6 font-semibold">
            Check your inbox for the recovery link.
          </p>
        )}
      </div>
      
      {/* Footer info */}
      <div className="fixed bottom-6 text-gray-600 text-[10px] font-bold uppercase tracking-[0.2em]">
          QuizVerse Infrastructure &copy; 2026
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
