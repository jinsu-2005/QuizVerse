import React, { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import ThemeToggle from "./components/ThemeToggle.jsx";

const SignIn = lazy(() => import("./routes/SignIn.jsx"));
const RoleGate = lazy(() => import("./routes/Auth/RoleGate.jsx"));
const SeedUsers = lazy(() => import("./routes/Auth/SeedUsers.jsx"));
const FirstTimeLogin = lazy(() => import("./routes/Auth/FirstTimeLogin.jsx"));
const StudentPortal = lazy(() => import("./routes/Student/StudentPortal.jsx"));
const TeacherPortal = lazy(() => import("./routes/Teacher/TeacherPortal.jsx"));
const SuperAdminPortal = lazy(() => import("./routes/Admin/SuperAdmin/SuperAdminPortal.jsx"));
const InstAdminPortal  = lazy(() => import("./routes/Admin/InstAdmin/InstAdminPortal.jsx"));
const DeptAdminPortal  = lazy(() => import("./routes/Admin/DeptAdmin/DeptAdminPortal.jsx"));
const QuizPage = lazy(() => import("./routes/quiz/QuizPage.jsx"));
const ResultPage = lazy(() => import("./routes/Results/ResultPage.jsx"));

function FloatingThemeToggle() {
  const location = useLocation();
  // These routes have their own built-in ThemeToggle in the sidebar
  if (location.pathname.startsWith("/teacher")) return null;
  if (location.pathname.startsWith("/admin")) return null;
  if (location.pathname.startsWith("/inst-admin")) return null;
  if (location.pathname.startsWith("/dept-admin")) return null;

  return (
    <div className="fixed right-4 top-4 z-[140] sm:right-6 sm:top-6">
      <ThemeToggle />
    </div>
  );
}

function Loader() {
  return (
    <div className="min-h-screen grid place-items-center bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-300">
      <p className="animate-pulse text-[var(--text-dim)]">Loading QuizVerse...</p>
    </div>
  );
}

function ProtectedRoute({ children, role }) {
  const { fbUser, profile, loading } = useAuth();

  if (loading) return <Loader />;
  if (!fbUser) return <Navigate to="/signin" replace />;
  if (!profile) return <Loader />;

  if (profile.verified !== true && profile.role !== "super_admin") {
    return <Navigate to="/verify" replace />;
  }

  const isAdmin = ["super_admin", "inst_admin", "dept_admin"].includes(profile.role);
  const isTeacher = profile.role === "teacher";
  const isStudent = profile.role === "student";

  if (role) {
    if (role === "teacher" && (isTeacher || isAdmin)) return children;
    if (role === "student" && isStudent) return children;
    if (role === "admin" && isAdmin) return children;
    // Fallback if they are navigating somewhere they shouldn't:
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (isTeacher) return <Navigate to="/teacher" replace />;
    return <Navigate to="/student" replace />;
  }

  return children;
}

function Gate() {
  const { fbUser, profile, loading } = useAuth();

  if (loading) return <Loader />;
  if (!fbUser) return <Navigate to="/signin" replace />;
  if (!profile) return <Loader />;

  if (profile.verified !== true && profile.role !== "super_admin") {
    return <Navigate to="/verify" replace />;
  }

  if (["super_admin"].includes(profile.role)) {
    return <Navigate to="/admin" replace />;
  }
  if (profile.role === "inst_admin") {
    return <Navigate to="/inst-admin" replace />;
  }
  if (profile.role === "dept_admin") {
    return <Navigate to="/dept-admin" replace />;
  }
  if (profile.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }
  return <Navigate to="/student" replace />;
}

function AuthOnly({ children }) {
  const { fbUser, loading } = useAuth();
  if (loading) return <Loader />;
  if (!fbUser) return <Navigate to="/signin" replace />;
  return children;
}

function Shell() {
  return (
    <>
      <FloatingThemeToggle />
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/" element={<Gate />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/role" element={<RoleGate />} />
          {import.meta.env.DEV && <Route path="/seed" element={<SeedUsers />} />}
          <Route
            path="/verify"
            element={
              <AuthOnly>
                <FirstTimeLogin />
              </AuthOnly>
            }
          />
          <Route
            path="/student"
            element={
              <ProtectedRoute role="student">
                <StudentPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute role="teacher">
                <TeacherPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <SuperAdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inst-admin"
            element={
              <ProtectedRoute role="admin">
                <InstAdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dept-admin"
            element={
              <ProtectedRoute role="admin">
                <DeptAdminPortal />
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
    <ThemeProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ThemeProvider>
  );
}
