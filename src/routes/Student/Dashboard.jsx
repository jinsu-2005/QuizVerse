// src/routes/student/Dashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  setDoc,
  doc,
} from "firebase/firestore";

/* ---------------------------- CONSTS ---------------------------- */

const DEPARTMENTS = [
  { label: "Information Technology (IT)", value: "IT" },
  { label: "Computer Science and Engineering (CSE)", value: "CSE" },
  { label: "Electronics and Communication Engineering (ECE)", value: "ECE" },
  { label: "Electrical and Electronics Engineering (EEE)", value: "EEE" },
  { label: "Mechanical Engineering (MECH)", value: "MECH" },
  { label: "Civil Engineering (CIVIL)", value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)", value: "AIDS" },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML" },
];

// All fields below require teacher/admin approval to change:
const LOCKED_FIELDS = [
  "name",
  "dob",
  "regNo",
  "gender",
  "institute",
  "academicYear",
  "department",
];

/* ---------------------------- DASHBOARD ---------------------------- */

export default function StudentDashboard() {
  const { fbUser, profile, loading, logout } = useAuth();
  const nav = useNavigate();
  console.log("AuthContext profile:", profile);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [busyQuizzes, setBusyQuizzes] = useState(true);
  const [openProfile, setOpenProfile] = useState(false);
  const [bypassFilters, setBypassFilters] = useState(false); // Debug mode
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");

  // lightweight toast
  const [toast, setToast] = useState({ type: "", msg: "" });
  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Guards
  useEffect(() => {
    if (loading) return;
    if (!fbUser) return nav("/signin", { replace: true });
    if (!profile || !profile.role) return nav("/role", { replace: true });
    if (profile.role !== "student") return nav("/teacher", { replace: true });
  }, [fbUser, profile, loading, nav]);

  // Load quizzes (filter by student's dept & year) - LIVE LISTENER
  useEffect(() => {
    if (!profile || profile.role !== "student") return;

    if (!profile.department || !profile.academicYear) {
      setBusyQuizzes(false);
      setQuizzes([]);
      return;
    }

    console.log("[DEBUG] Fetching quizzes for:", { dept: profile.department, year: profile.academicYear });
    setBusyQuizzes(true);

    const qz = bypassFilters
      ? query(collection(db, "quizzes"), orderBy("createdAt", "desc"))
      : query(
        collection(db, "quizzes"),
        where("department", "==", profile.department),
        where("academicYear", "==", profile.academicYear),
        orderBy("createdAt", "desc")
      );

    const unsub = onSnapshot(qz, (snap) => {
      console.log(`[DEBUG] Received ${snap.docs.length} quizzes from Firestore`);
      setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setBusyQuizzes(false);
    }, (e) => {
      console.error("Load quizzes error (Check console for index link):", e);
      setToast({
        type: "error",
        msg: e.code === "failed-precondition"
          ? "Database index missing. Check browser console for the setup link."
          : `Firestore error: ${e.message}`
      });
      setBusyQuizzes(false);
    });

    return () => unsub();
  }, [profile, bypassFilters]);

  // Live attempts stream from root collection quizAttempts
  useEffect(() => {
    if (!fbUser) return;
    const ref = collection(db, "quizAttempts");
    const q = query(
      ref,
      where("studentId", "==", fbUser.uid),
      orderBy("completedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (ss) => setAttempts(ss.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => {
        console.error("Load attempts error:", err);
        // This error is likely a MISSING INDEX.
        setToast({ type: "error", msg: "Could not load quiz history." });
      }
    );
    return () => unsub();
  }, [fbUser]);

  const stats = useMemo(() => computeStats(attempts), [attempts]);
  
  const uniqueQuizHistory = useMemo(() => {
    const map = {};
    // attempts are sorted desc by completedAt
    attempts.forEach(a => {
      const qid = a.quizId;
      const score = a.total > 0 ? a.score / a.total : 0;
      if (!map[qid]) {
        map[qid] = {
          quizTitle: a.quizTitle || "Untitled Quiz",
          quizId: a.quizId,
          bestScore: score,
          bestAttemptId: a.id,
          latestScore: score,
          latestAttemptId: a.id,
          latestDate: a.completedAt,
          totalAttempts: 0
        };
      }
      map[qid].totalAttempts++;
      if (score > map[qid].bestScore) {
        map[qid].bestScore = score;
        map[qid].bestAttemptId = a.id;
      }
    });
    return Object.values(map).sort((a,b) => {
        const da = a.latestDate?.toMillis?.() || new Date(a.latestDate).getTime() || 0;
        const db = b.latestDate?.toMillis?.() || new Date(b.latestDate).getTime() || 0;
        return db - da;
    });
  }, [attempts]);

  const quizStats = useMemo(() => {
    const map = {};
    attempts.forEach(a => {
      const qid = a.quizId;
      const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
      if (!map[qid]) map[qid] = { best: 0, count: 0 };
      map[qid].count++;
      if (pct > map[qid].best) map[qid].best = pct;
    });
    return map;
  }, [attempts]);


  const filteredQuizzes = useMemo(() => {
    return quizzes.filter(q => {
      const matchesSearch = q.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            q.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDiff = difficultyFilter === "All" || q.difficulty === difficultyFilter;
      return matchesSearch && matchesDiff;
    });
  }, [quizzes, searchQuery, difficultyFilter]);

  if (loading || !profile) {
    return (
      <Screen>
        <Header profile={profile} onOpenProfile={() => setOpenProfile(true)} onLogout={logout} attempts={attempts} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header profile={profile} onOpenProfile={() => setOpenProfile(true)} onLogout={logout} attempts={attempts} />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Attempts"
          value={stats.totalAttempts}
          className="opacity-0 animate-[fadeInUp_500ms_ease_100ms_forwards]"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />}
        />
        <StatCard
          label="Average Score"
          value={`${stats.avg}%`}
          className="opacity-0 animate-[fadeInUp_500ms_ease_200ms_forwards]"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />}
        />
        <StatCard
          label="Best Score"
          value={`${stats.best}%`}
          className="opacity-0 animate-[fadeInUp_500ms_ease_300ms_forwards]"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />}
        />
      </div>

      {/* Context badges */}
      <div className="mt-3 text-gray-300">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <Badge>{profile.institute || "No Institute"}</Badge>
          <Badge>{profile.academicYear || "No Year"}</Badge>
          <Badge>Dept: {profile.department || "No Dept"}</Badge>
          {profile.regNo ? <Badge>Reg No: {profile.regNo}</Badge> : null}
        </div>
      </div>

      {/* Main Grid: Quizzes + Quizify CTA */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Available Quizzes">
          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              placeholder="Search quizzes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <select 
              value={difficultyFilter}
              onChange={e => setDifficultyFilter(e.target.value)}
              className="bg-gray-900 border border-gray-700/50 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Moderate">Moderate</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          {busyQuizzes ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : (!profile.department || !profile.academicYear) ? (
            <div style={{
              padding: "1.5rem",
              borderRadius: "1rem",
              border: "1px solid rgba(45,127,234,0.25)",
              background: "rgba(45,127,234,0.06)",
              textAlign: "center",
              color: "#7fa8d0"
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
              <p style={{ fontWeight: 700, marginBottom: "0.5rem", color: "#e8f0fe" }}>
                Profile Incomplete
              </p>
              <p style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
                Your Academic Year or Department is not set. Complete your profile to see quizzes.
              </p>
              <button
                onClick={() => nav("/verify")}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "999px",
                  border: "none",
                  background: "var(--accent, #2d7fea)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
              >
                Complete Profile →
              </button>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Empty text="No quizzes match your criteria." />
          ) : (
            <div className="grid gap-4">
              {bypassFilters && (
                <div className="rounded-lg bg-blue-600/20 border border-blue-500/30 p-3 text-[11px] text-blue-200 flex items-center justify-between">
                  <span>Showing results for all departments (Debug Mode)</span>
                  <button onClick={() => setBypassFilters(false)} className="underline">Restore Filters</button>
                </div>
              )}
              {filteredQuizzes.map((qz, i) => (
                <QuizCard
                  key={qz.id}
                  quiz={qz}
                  stats={quizStats[qz.id]}
                  onStart={() => nav(`/quiz/${qz.id}`)}
                  className="opacity-0 animate-[fadeInUp_500ms_ease_forwards]"
                  style={{ animationDelay: `${i * 100 + 400}ms` }}
                />
              ))}
            </div>
          )}
        </Section>

        {/* Quizify CTA */}
        <Section title="Level Up with Quizify (Create Your Own Quizzes)">
          <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-6 group">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-blue-600/20 blur-3xl transition-all duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-600/20 blur-3xl transition-all duration-300 group-hover:scale-110" />

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-200">
                  <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  Supercharge your revisions
                </div>
                <h3 className="mt-3 text-2xl font-extrabold">
                  Practice smarter with <span className="text-blue-400">Quizify</span>
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Build bite-sized quizzes from your topics, get instant feedback, and track mastery.
                </p>
              </div>

              <div className="shrink-0">
                <a
                  href="https://jinsu-quizify-ai.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/30 transition hover:translate-y-[-1px] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Open Quizify in a new tab"
                >
                  Launch Quizify
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                    <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <div className="mt-2 text-[10px] text-gray-400 text-right">Opens in a new tab</div>
              </div>
            </div>

            {/* Benefits row */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Benefit chip="Create" text="Turn any chapter into quick quizzes in seconds." />
              <Benefit chip="Practice" text="Adaptive repetition so weak topics rise to 100%." />
              <Benefit chip="Explain" text="Instant solutions & hints to fix mistakes fast." />
            </div>

            {/* Footer tip */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-4">
              <div className="text-xs text-gray-400">
                Tip: Do 10 questions a day to build an unstoppable streak.
              </div>
              <kbd className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1 text-[11px] text-gray-300">
                Pro move: Pin Quizify in your browser
              </kbd>
            </div>
          </div>
        </Section>
      </div>

      {/* Recent Attempts */}
      <Section title="Performance History">
        {uniqueQuizHistory.length === 0 ? (
          <Empty text="Your quiz attempts will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueQuizHistory.map((h, i) => (
              <div 
                key={h.quizId} 
                className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 flex flex-col transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl group"
              >
                <div className="flex flex-col gap-1 mb-4">
                  <h4 className="font-bold text-gray-100 group-hover:text-indigo-300 transition-colors line-clamp-1">{h.quizTitle}</h4>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{h.totalAttempts} Attempt{h.totalAttempts !== 1 ? 's' : ''} total</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-950/40 border border-gray-800/80 p-3 text-center">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-400/80 mb-1">Latest</div>
                    <div className={`text-lg font-black ${h.latestScore >= 0.8 ? 'text-green-400' : h.latestScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(h.latestScore * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-950/40 border border-indigo-500/20 p-3 text-center ring-1 ring-indigo-500/20">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-400 mb-1">Best</div>
                    <div className={`text-lg font-black ${h.bestScore >= 0.8 ? 'text-green-400' : h.bestScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(h.bestScore * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4 px-1">
                  <span>Last taken:</span>
                  <span className="font-semibold text-gray-400">{formatDate(h.latestDate)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => nav(`/result/${h.latestAttemptId}`)}
                    className="flex-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 text-xs font-bold transition-colors border border-gray-700"
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => nav(`/result/${h.bestAttemptId}`)}
                    className="flex-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-2 text-xs font-bold transition-all border border-indigo-500/30"
                  >
                    Best
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Profile Drawer */}
      <ProfileDrawer
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        profile={profile}
        attempts={attempts}
      />

      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed top-6 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${toast.type === "error" ? "bg-red-600" : "bg-green-600"
            } text-white animate-[fadeIn_300ms_ease]`}
        >
          {toast.msg}
        </div>
      )}
    </Screen>
  );
}

/* ------------------------------ UI BITS ------------------------------ */

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        {/* ambient glows */}
        <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        {children}
      </div>
    </div>
  );
}

function Header({ profile, onOpenProfile, onLogout, attempts }) {
  const user = auth.currentUser;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold shadow-lg shadow-indigo-500/30">Q</div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Student Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-indigo-300 font-medium text-sm">
              Welcome back, {profile?.name || user?.displayName || user?.email}
            </p>
            {attempts?.length > 0 && (
              <button 
                onClick={() => window.location.href = `/quiz/${attempts[0].quizId}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
                title={`Retake ${attempts[0].quizTitle || "Last Quiz"}`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Continue Last Quiz
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick Stats + Avatar */}
      <div className="flex items-center gap-3">


        <button
          onClick={onOpenProfile}
          className="group relative rounded-full p-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 transition-transform"
          title="Profile & Settings"
        >
          <img
            src={
              profile?.photoURL ||
              auth.currentUser?.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                profile?.name || auth.currentUser?.displayName || "U"
              )}&background=0D8ABC&color=fff`
            }
            alt="avatar"
            className="h-10 w-10 rounded-full object-cover border-2 border-gray-900"
          />
        </button>

        <button
          onClick={onLogout}
          className="hidden sm:inline-flex rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-900/40"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}



function Badge({ children }) {
  return (
    <span className="px-2 py-1 rounded-full bg-gray-800/80 border border-gray-700 text-xs text-gray-200">
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-xl font-semibold text-white/90">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ label, value, className = "", icon }) {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900/80 to-indigo-950/20 backdrop-blur-xl p-5 flex items-center gap-4 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_10px_40px_-15px_rgba(79,70,229,0.3)] hover:border-indigo-500/30 ${className}`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div>
        <div className="mt-1 text-2xl font-black text-white tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, onStart, stats, className = "", style = {} }) {
  const attemptsMade = stats?.count || 0;
  const bestScore = stats?.best || 0;
  const maxAttempts = quiz.maxAttempts || 0;
  const isLimited = maxAttempts > 0 && attemptsMade >= maxAttempts;

  const diffColor = 
    quiz.difficulty === "Easy" ? "text-green-400 border-green-500/30 bg-green-500/10" :
    quiz.difficulty === "Hard" ? "text-red-400 border-red-500/30 bg-red-500/10" :
    "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    
  const timeLabel = quiz.timer?.mode === "perQuestion" 
    ? `${quiz.timer.time}s / Q` 
    : quiz.timer?.mode === "total" 
      ? `${quiz.timer.time}m total` 
      : "Untimed";

  return (
    <div
      className={`relative overflow-hidden group rounded-2xl border bg-gray-900/70 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_10px_40px_-15px_rgba(79,70,229,0.5)] ${
        isLimited ? "border-red-900/30 grayscale-[0.5]" : "border-gray-800 hover:border-indigo-500/50"
      } ${className}`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{quiz.title}</h3>
            {attemptsMade > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20">
                Best: {bestScore}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">{quiz.description || "—"}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1 relative z-10">
        <span className="px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          {quiz.department} • {quiz.academicYear}
        </span>
        {quiz.difficulty && (
          <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold ${diffColor}`}>
            {quiz.difficulty}
          </span>
        )}
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {timeLabel}
        </span>
        
        {maxAttempts > 0 && (
          <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold ${
            isLimited ? "bg-red-950/40 border-red-800/50 text-red-400" : "bg-gray-800/80 border-gray-700 text-gray-400"
          }`}>
            {attemptsMade} / {maxAttempts} Attempts
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-800/50 relative z-10">
        <span className="text-xs text-gray-400 font-medium">
          By {quiz.createdByName || quiz.createdBy?.slice(0, 6) || "Teacher"}
        </span>
        
        {isLimited ? (
          <div className="flex items-center gap-2 text-[11px] font-bold text-red-400/80 bg-red-950/20 px-3 py-2 rounded-xl border border-red-900/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
            Limit Reached
          </div>
        ) : (
          <button
            onClick={onStart}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-white px-5 py-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
          >
            {attemptsMade > 0 ? "Retake Quiz" : "Start Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

function Benefit({ chip, text }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 transition group-hover:translate-y-[-1px]">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gray-700 bg-gray-800/70 px-2.5 py-1 text-[10px] font-semibold text-gray-200">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400" />
        {chip}
      </div>
      <p className="text-sm text-gray-300">{text}</p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 text-gray-400 text-sm">
      {text}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-800 rounded" />
      <div className="mt-3 h-8 w-16 bg-gray-800 rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5 animate-pulse">
      <div className="h-4 w-1/3 bg-gray-800 rounded" />
      <div className="mt-3 h-4 w-1/2 bg-gray-800 rounded" />
    </div>
  );
}

/* ---------------------------- PROFILE DRAWER ---------------------------- */

function ProfileDrawer({ open, onClose, profile, attempts }) {
  const { fbUser } = useAuth();

  // Only photo is editable by the student (locked fields shown below)
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Request-edit state
  const [reqOpen, setReqOpen] = useState(false);
  const [reqFields, setReqFields] = useState(
    LOCKED_FIELDS.reduce((acc, k) => ({ ...acc, [k]: false }), {})
  );
  const [reqReason, setReqReason] = useState("");
  const [reqValues, setReqValues] = useState(
    LOCKED_FIELDS.reduce((acc, k) => ({ ...acc, [k]: profile?.[k] || "" }), {})
  );
  const [hasPending, setHasPending] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhotoURL(profile?.photoURL || "");
    setReqValues(LOCKED_FIELDS.reduce((acc, k) => ({ ...acc, [k]: profile?.[k] || "" }), {}));
    checkPending();
  }, [open, profile]);

  const checkPending = async () => {
    if (!fbUser) return;
    setCheckingPending(true);
    try {
      const qy = query(
        collection(db, "editRequests"),
        where("userId", "==", fbUser.uid),
        where("status", "==", "pending")
      );
      const snap = await getDocs(qy);
      setHasPending(!snap.empty);
    } catch (e) {
      console.error("checkPending error:", e);
    } finally {
      setCheckingPending(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await compressToDataURL(file, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.8,
        mimeType: "image/jpeg",
      });
      setPhotoURL(dataUrl);
    } catch (e) {
      console.error("Compress error:", e);
      alert("Could not process the image.");
    } finally {
      setUploading(false);
    }
  };

  const useGooglePhoto = () => {
    const googleUrl = auth.currentUser?.photoURL;
    if (googleUrl) setPhotoURL(googleUrl);
  };

  const save = async () => {
    if (!fbUser) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "users", fbUser.uid), { photoURL: photoURL || null }, { merge: true });
      onClose();
    } catch (e) {
      alert("Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!fbUser) return;
    const fields = Object.entries(reqFields).filter(([k,v]) => v).map(([k]) => k);
    if (!fields.length) return alert("Select at least one field.");
    if (!reqReason.trim()) return alert("Add a reason.");

    setSaving(true);
    try {
      const requestedChanges = {};
      const oldValues = {};
      fields.forEach(f => {
        requestedChanges[f] = reqValues[f];
        oldValues[f] = profile[f] || null;
      });

      await addDoc(collection(db, "editRequests"), {
        userId: fbUser.uid,
        userName: profile?.name || null,
        userEmail: fbUser.email || null,
        institute: profile?.institute || null,
        department: profile?.department || null,
        academicYear: profile?.academicYear || null,
        fields,
        requestedChanges,
        oldValues,
        reason: reqReason.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      setHasPending(true);
      setReqOpen(false);
      alert("Request submitted.");
    } catch (e) {
      alert("Could not submit request.");
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = photoURL || profile?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.name || "User")}&background=0D8ABC&color=fff`;

  return (
    <>
      <div className={`fixed inset-0 bg-black/40 transition-opacity z-40 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-950/95 backdrop-blur-xl border-l border-gray-800 transition-transform duration-300 z-50 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">Your Profile</h3>
          <button onClick={onClose} className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 hover:bg-gray-700 transition font-bold text-xs uppercase">Close</button>
        </div>

        <div className="h-[calc(100vh-58px)] overflow-y-auto overscroll-contain p-4">
          <div className="flex flex-col items-center mt-4 mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full blur opacity-25" />
              <img src={avatarSrc} alt="avatar" className="relative h-24 w-24 rounded-full object-cover border-2 border-gray-800 shadow-xl" />
              <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => fileRef.current?.click()} className="text-white text-[10px] font-bold uppercase tracking-wider mb-1">Upload</button>
                <button onClick={useGooglePhoto} className="text-gray-300 text-[9px] uppercase tracking-wider">Google</button>
                <input ref={fileRef} onChange={(e) => handleUpload(e.target.files?.[0])} type="file" accept="image/*" className="hidden" />
              </div>
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">{profile?.name}</h2>
            <p className="text-sm text-indigo-400 font-medium">{profile?.regNo || "No Reg No"}</p>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3 px-1">Academic Context</h4>
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1">
                <LockedField label="Institute" value={profile?.institute} />
                <LockedField label="Department" value={DEPARTMENTS.find(d => d.value === profile?.department)?.label || profile?.department} />
                <LockedField label="Academic Year" value={profile?.academicYear} />
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-3 px-1">Personal Info</h4>
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-1">
                <LockedField label="Full Name" value={profile?.name} />
                <LockedField label="Date of Birth" value={profile?.dob} />
                <LockedField label="Gender" value={profile?.gender} />
              </div>
            </div>

            <div className="pt-6 flex flex-wrap gap-3 justify-between items-center border-t border-gray-800/50">
              <button
                type="button"
                onClick={() => setReqOpen(true)}
                disabled={checkingPending || hasPending}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${hasPending ? "bg-gray-800 text-gray-400 cursor-not-allowed border-gray-700" : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white"}`}
              >
                {hasPending ? "Request Pending" : "Request Edit"}
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-400 hover:bg-gray-800 transition-colors">Cancel</button>
                <button disabled={saving} onClick={save} className="rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {reqOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setReqOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 shadow-2xl overflow-hidden animate-[fadeIn_200ms_ease]">
            <div className="p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
              <h4 className="text-lg font-bold">Request Edit Permission</h4>
              <p className="text-sm text-gray-400 mt-1">Select fields and enter the new data for teacher approval.</p>
            </div>
            
            <div className="p-5 max-h-[400px] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-3">
                {LOCKED_FIELDS.map((f) => (
                  <div key={f} className="flex flex-col gap-2 rounded-xl bg-gray-800/40 p-3 border border-gray-700/50">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-500 rounded"
                        checked={!!reqFields[f]}
                        onChange={(e) => setReqFields({ ...reqFields, [f]: e.target.checked })}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        {f === "regNo" ? "Register Number" : f === "dob" ? "Date of Birth" : f === "academicYear" ? "Academic Year" : f}
                      </span>
                    </label>

                    {reqFields[f] && (
                      <div className="mt-1">
                        {f === "department" ? (
                          <select 
                            value={reqValues[f]} 
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        ) : f === "gender" ? (
                          <select 
                            value={reqValues[f]} 
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {["Male", "Female", "Other", "Prefer not to say"].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        ) : (
                          <input
                            type={f === "dob" ? "date" : "text"}
                            value={reqValues[f]}
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            placeholder={`New ${f}...`}
                            className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:dark]"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">Reason for Request</label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Explain why you need this change..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-gray-800 bg-gray-900/80 flex justify-end gap-3 sticky bottom-0 z-10">
              <button onClick={() => setReqOpen(false)} className="rounded-xl border border-gray-700 bg-gray-800 px-5 py-2.5 text-xs font-bold uppercase text-gray-200 hover:bg-gray-700 transition">Cancel</button>
              <button onClick={submitRequest} disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 text-xs font-bold uppercase transition disabled:bg-gray-700">{saving ? "Submitting..." : "Submit Request"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col p-3 border-b border-gray-800/50 last:border-0">
      <label className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <div className="text-sm font-medium text-gray-200">
        {value || "—"}
      </div>
    </div>
  );
}

async function compressToDataURL(file, { maxWidth = 512, maxHeight = 512, quality = 0.8, mimeType = "image/jpeg" } = {}) {
  const img = await fileToImage(file);
  const { width, height } = scaleToFit(img.width, img.height, maxWidth, maxHeight);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL(mimeType, quality);
}
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function scaleToFit(w, h, maxW, maxH) {
  if (w <= maxW && h <= maxH) return { width: w, height: h };
  const ratio = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
function computeStats(attempts) {
  if (!attempts.length) return { totalAttempts: 0, avg: 0, best: 0 };
  const totals = attempts.map((a) => ({ pct: (a.total > 0) ? Math.round((a.score / a.total) * 100) : 0, when: tsToMillis(a.completedAt) }));
  const totalAttempts = attempts.length;
  const avg = Math.round(totals.reduce((s, x) => s + x.pct, 0) / totals.length);
  const best = Math.max(...totals.map((x) => x.pct));
  return { totalAttempts, avg, best };
}
function tsToMillis(t) {
  if (!t) return 0;
  if (typeof t === "object" && "toMillis" in t) return t.toMillis();
  const d = new Date(t);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}
function formatDate(t) {
  const ms = tsToMillis(t);
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}