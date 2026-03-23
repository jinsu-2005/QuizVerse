// src/App.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

// Lazy-loaded pages (speeds up initial load)
const SignIn            = lazy(() => import("./routes/SignIn.jsx"));
const RoleGate          = lazy(() => import("./routes/Auth/RoleGate.jsx"));
const StudentDashboard  = lazy(() => import("./routes/Student/Dashboard.jsx"));
const TeacherDashboard  = lazy(() => import("./routes/Teacher/Dashboard.jsx"));
const QuizPage       = lazy(() => import("./routes/quiz/QuizPage.jsx"));
const ResultPage     = lazy(() => import("./routes/Results/ResultPage.jsx"));

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
   - If no role yet → <RoleGate />
   - If role mismatch (e.g., student hits /teacher) → redirect
-------------------------------------------------- */
function ProtectedRoute({ children, role }) {
  const { fbUser, profile, loading } = useAuth();

  if (loading) return <Loader />;

  if (!fbUser) return <Navigate to="/signin" replace />;

  // If profile not completed (no role), force RoleGate
  if (!profile || !profile.role) return <RoleGate />;

  if (role && profile.role !== role) {
    // Send to the correct dashboard
    return <Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />;
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

  if (!profile || !profile.role) return <RoleGate />;

  return <Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />;
}

/* ---------------- Shell with routes ---------------- */
function Shell() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Gate />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/role" element={<RoleGate />} />

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
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
