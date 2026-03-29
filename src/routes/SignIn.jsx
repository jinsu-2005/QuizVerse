import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext.jsx";

// Role definitions
const ROLES = ["student", "teacher", "admin"];
const ADMIN_TYPES = ["dept_admin", "inst_admin", "super_admin"];
const ADMIN_LABELS = {
  dept_admin: "Department Admin",
  inst_admin: "Institutional Admin",
  super_admin: "Super Admin",
};

// Two-line JSX display for segment buttons
const ADMIN_DISPLAY = {
  dept_admin:  <><span style={{display:"block"}}>Department</span><span style={{display:"block"}}>Admin</span></>,
  inst_admin:  <><span style={{display:"block"}}>Institutional</span><span style={{display:"block"}}>Admin</span></>,
  super_admin: <><span style={{display:"block"}}>Super</span><span style={{display:"block"}}>Admin</span></>,
};

// Dept admin can use Google; inst/super cannot
const GOOGLE_ALLOWED_ROLES = ["student", "teacher", "dept_admin"];

export default function SignIn() {
  const nav = useNavigate();
  const { signInWithGoogle } = useAuth();

  const [role, setRole] = useState("student");      // student | teacher | admin
  const [adminType, setAdminType] = useState("dept_admin");   // sub-role when role=admin
  const [idField, setIdField] = useState("");             // regNo / facultyId / username
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });
  const [resetSent, setResetSent] = useState(false);

  // Derived helpers
  const activeRole = role === "admin" ? adminType : role;
  const googleAllowed = GOOGLE_ALLOWED_ROLES.includes(activeRole);
  const isAdminSelected = role === "admin";

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ─── ID → Email resolver ────────────────────────────────────────────────────
  // We query Firestore WITHOUT anonymous auth to avoid auth-state conflicts.
  // Instead we use the Firebase REST API via getDocs which doesn't need
  // the user to be signed in (the Firestore rules must allow reads without auth,
  // OR we sign out any stale session first and use the server-side lookup).
  const resolveEmail = async (input) => {
    if (input.includes("@")) return input;

    // Sign out any stale/anonymous session so auth state is clean before querying
    const current = auth.currentUser;
    if (current?.isAnonymous) {
      const { signOut: _so } = await import("firebase/auth");
      await _so(auth).catch(() => {});
    }

    const col = collection(db, "users");
    const idNum = Number(input);

    // Try both string and numeric forms of the ID
    const queries = [
      getDocs(query(col, where("regNo",    "==", input))),
      getDocs(query(col, where("collegeId","==", input))),
      getDocs(query(col, where("username", "==", input))),
      ...(!isNaN(idNum) ? [
        getDocs(query(col, where("regNo",    "==", idNum))),
        getDocs(query(col, where("collegeId","==", idNum))),
      ] : []),
    ];

    // Run sequentially so we don't blast Firestore with parallel denied reads
    for (const q of queries) {
      try {
        const snap = await q;
        if (!snap.empty) return snap.docs[0].data().email;
      } catch (_) {
        // Skip if this specific query fails (e.g. permission on that field)
      }
    }
    throw new Error(`ID "${input}" not found in our records.`);
  };

  // ─── Main login ─────────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setBusy(true);
    setToast({ type: "", msg: "" });

    try {
      if (auth.currentUser) await signOut(auth);

      const email = await resolveEmail(idField.trim());
      await signInWithEmailAndPassword(auth, email, password);
      setToast({ type: "success", msg: "Login successful! Redirecting…" });
      nav("/");
    } catch (err) {
      console.error("Login error:", err);

      // auth/invalid-credential usually means one of:
      //   (a) wrong password
      //   (b) Firebase linked this account to Google, invalidating old password tokens
      // Guide the user clearly for case (b).
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setToast({
          type: "error",
          msg: "Incorrect password. If you recently signed in with Google, your password may have been reset — use \"Forgot?\" to set a new one.",
        });
      } else if (err.code === "auth/too-many-requests") {
        setToast({
          type: "error",
          msg: "Account temporarily locked due to too many attempts. Wait a few minutes or use \"Forgot?\" to reset.",
        });
      } else {
        setToast({ type: "error", msg: cleanMsg(err.message) });
      }
    } finally {
      setBusy(false);
    }
  };

  // ─── Google login ────────────────────────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    if (!googleAllowed) return;
    setBusy(true);
    try {
      await signInWithGoogle();
      nav("/");
    } catch (err) {
      // Show the message from signInWithGoogle (which may tell user to use password)
      setToast({ type: "error", msg: err.message || "Google sign-in failed." });
    } finally {
      setBusy(false);
    }
  };

  // ─── Forgot password ─────────────────────────────────────────────────────────
  const handleForgot = async () => {
    if (!idField) {
      setToast({ type: "error", msg: "Enter your ID or email first." });
      return;
    }
    setBusy(true);
    try {
      const email = await resolveEmail(idField.trim());
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setToast({ type: "success", msg: "Reset link sent to your registered email ✉️" });
    } catch (err) {
      setToast({ type: "error", msg: cleanMsg(err.message) });
    } finally {
      setBusy(false);
    }
  };

  // ─── Label helpers ───────────────────────────────────────────────────────────
  const idLabel = () => {
    if (role === "student") return "Register Number";
    if (role === "teacher") return "Faculty ID";
    return "Username / Email";
  };
  const idPlaceholder = () => {
    if (role === "student") return "9618xxxxxxxxxx";
    if (role === "teacher") return "9618xxxxx";
    return "admin_username";
  };

  return (
    <div className="signin-bg min-h-screen flex items-center justify-center p-4 relative">

      {/* ── Ambient glow ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="glow-orb glow-orb-1" />
        <div className="glow-orb glow-orb-2" />
      </div>

      {/* ── Card ── */}
      <div className="signin-card w-full max-w-md relative flex flex-col">

        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="brand-icon mb-4">Q</div>
          <h1 className="text-4xl font-black tracking-tight signin-heading mb-1">QuizVerse</h1>
          <p className="signin-subtext text-sm text-center">
            The intelligent learning workspace.
          </p>
        </div>

        {/* ── Role Selector ── */}
        <div className="role-tabs mb-6">
          {ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => { setRole(r); setIdField(""); setPassword(""); }}
              className={`role-tab ${role === r ? "role-tab-active" : ""}`}
            >
              {r === "student" ? "Student" : r === "teacher" ? "Teacher" : "Admin"}
            </button>
          ))}
        </div>

        {/* ── Admin Sub-type Segmented Control ── */}
        {isAdminSelected && (
          <div className="admin-segment-wrap mb-6">
            <div className="admin-segment">
              {ADMIN_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAdminType(t)}
                  className={`admin-segment-btn ${adminType === t ? "admin-segment-active" : ""}`}
                  aria-pressed={adminType === t}
                >
                  {ADMIN_DISPLAY[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Login Form ── */}
        <form onSubmit={handleAuth} className="space-y-4">


          <div>
            <label className="signin-label">{idLabel()}</label>
            <input
              type="text"
              className="signin-input"
              placeholder={idPlaceholder()}
              value={idField}
              onChange={(e) => setIdField(e.target.value)}
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="signin-label" style={{ marginBottom: 0 }}>Password</label>
              <button type="button" onClick={handleForgot} className="forgot-btn">
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPwd ? "text" : "password"}
                className="signin-input pr-12"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                className="pwd-toggle"
                aria-label="Toggle password visibility"
              >
                {showPwd ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" disabled={busy} className="signin-submit-btn">
            {busy ? "Authenticating…" : `Sign In as ${role === "admin" ? ADMIN_LABELS[adminType] : (role.charAt(0).toUpperCase() + role.slice(1))}`}
          </button>

          {/* ── Google at the bottom (conditional) ── */}
          {googleAllowed && (
            <>
              <div className="signin-divider" style={{ marginTop: "0.75rem" }}>
                <span className="signin-divider-text">or continue with</span>
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="google-btn w-full"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
                  <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.048 36.453 44 30.861 44 24c0-1.341-.138-2.65-.389-3.917z" />
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </form>

        {/* Reset hint */}
        {resetSent && (
          <p className="text-xs text-center mt-4" style={{ color: "var(--color-success)" }}>
            ✅ Check your inbox for the recovery link.
          </p>
        )}

        {/* Footer */}
        <p className="signin-footer-text" style={{ marginTop: "auto", paddingTop: "2rem" }}>
          QuizVerse © 2026 — Ponjesly College of Engineering
        </p>
      </div>

      {/* ── Toast ── */}
      {toast.msg && (
        <div className={`signin-toast ${toast.type === "error" ? "signin-toast-error" : "signin-toast-success"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function cleanMsg(m) {
  return (m || "")
    .replace(/^Firebase:\s*/i, "")
    .replace(/\(auth\/[^\)]+\)/i, "")
    .trim();
}
