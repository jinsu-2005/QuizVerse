// src/App.jsx
import React, { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

// Lazy-loaded pages (speeds up initial load)
const SignIn            = lazy(() => import("./routes/SignIn.jsx"));
const SeedUsers         = lazy(() => import("./routes/Auth/SeedUsers.jsx"));
const FirstTimeLogin    = lazy(() => import("./routes/Auth/FirstTimeLogin.jsx"));
const StudentDashboard  = lazy(() => import("./routes/Student/Dashboard.jsx"));
const TeacherDashboard  = lazy(() => import("./routes/Teacher/Dashboard.jsx"));
const QuizPage       = lazy(() => import("./routes/quiz/QuizPage.jsx"));
const ResultPage     = lazy(() => import("./routes/Results/ResultPage.jsx"));

/* ---------------- Theme hook + toggle ----------------
   Persists preference to localStorage.
   Applies data-theme="light" to <html> for light mode.
   Default: dark (no attribute needed).
------------------------------------------------ */
function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("qv-theme") || "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("qv-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  return { theme, toggle };
}

function GlobalThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      onClick={onToggle}
      className="global-theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Sun — shown in dark mode to invite switching to light */}
      <svg className="icon-sun" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464l-.707-.707a1 1 0 00-1.414 1.414l.707.707a1 1 0 001.414-1.414zm2.12 10.607a1 1 0 010-1.414l.706-.707a1 1 0 111.414 1.414l-.707.707a1 1 0 01-1.414 0zM4 11a1 1 0 100-2H3a1 1 0 100 2h1z" clipRule="evenodd" />
      </svg>
      {/* Moon — shown in light mode to invite switching to dark */}
      <svg className="icon-moon" fill="currentColor" viewBox="0 0 20 20">
        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
      </svg>
    </button>
  );
}

/* ---------------- Small loader ---------------- */
function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-gray-900 text-white">
      <p className="animate-pulse text-gray-400">Loading QuizVerse…</p>
    </div>
  );
}

/* ---------------- ProtectedRoute ----------------
   - If not logged in → /signin
   - If loginCount === 0 → /verify (FirstTimeLogin)
   - If role mismatch → redirect to correct dashboard
-------------------------------------------------- */
function ProtectedRoute({ children, role }) {
  const { fbUser, profile, loading } = useAuth();

  if (loading) return <Loader />;

  if (!fbUser) return <Navigate to="/signin" replace />;

  // No profile doc yet (edge case during seeding)
  if (!profile) return <Loader />;

  // First-time login: redirect to verify if not yet verified
  if (profile.verified !== true && profile.role !== "super_admin") {
    return <Navigate to="/verify" replace />;
  }

  // Role-based access control
  const isAdmin = ["super_admin", "inst_admin", "dept_admin"].includes(profile.role);
  const isTeacher = profile.role === "teacher";
  const isStudent = profile.role === "student";

  if (role) {
    if (role === "teacher" && (isTeacher || isAdmin)) return children;
    if (role === "student" && isStudent) return children;
    if (role === "admin" && isAdmin) return children;

    // Send to the correct dashboard
    return <Navigate to={profile.role === "student" ? "/student" : "/teacher"} replace />;
  }

  return children;
}

/* ---------------- Gate (root) ----------------
   Decides where "/" should go based on current state
------------------------------------------------ */
function Gate() {
  const { fbUser, profile, loading } = useAuth();

  if (loading) return <Loader />;

  if (!fbUser) return <Navigate to="/signin" replace />;

  if (!profile) return <Loader />;

  // First-time login: redirect to verify if not yet verified
  if (profile.verified !== true && profile.role !== "super_admin") {
    return <Navigate to="/verify" replace />;
  }

  if (["teacher", "super_admin", "inst_admin", "dept_admin"].includes(profile.role)) {
    return <Navigate to="/teacher" replace />;
  }

  return <Navigate to="/student" replace />;
}

/* ---------------- AuthOnly ----------------
   Lightweight guard for /verify:
   only checks if user is logged in.
   Does NOT check verified (avoids redirect loop).
------------------------------------------------ */
function AuthOnly({ children }) {
  const { fbUser, loading } = useAuth();
  if (loading) return <Loader />;
  if (!fbUser) return <Navigate to="/signin" replace />;
  return children;
}


function Shell() {
  const { theme, toggle } = useTheme();
  return (
    <>
      <GlobalThemeToggle theme={theme} onToggle={toggle} />
      <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Gate />} />
        <Route path="/signin" element={<SignIn />} />
        {/* /seed: dev-only tool, disabled in production */}
        {import.meta.env.DEV && (
          <Route path="/seed" element={<SeedUsers />} />
        )}
        <Route path="/verify" element={
            <AuthOnly>
                <FirstTimeLogin />
            </AuthOnly>
        } />

        <Route
          path="/student"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin alias - for now mapping to teacher dash or specialized views later */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/quiz/:quizId"
          element={
            <ProtectedRoute role="student">
              <QuizPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/result/:attemptId"
          element={
            <ProtectedRoute>
              <ResultPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
