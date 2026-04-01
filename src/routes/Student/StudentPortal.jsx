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
  { label: "First Year - Foundation (FY)",                        value: "FY"    },
  { label: "Information Technology (IT)",                         value: "IT"    },
  { label: "Computer Science and Engineering (CSE)",              value: "CSE"   },
  { label: "Electronics and Communication Engineering (ECE)",     value: "ECE"   },
  { label: "Electrical and Electronics Engineering (EEE)",        value: "EEE"   },
  { label: "Mechanical Engineering (MECH)",                       value: "MECH"  },
  { label: "Civil Engineering (CIVIL)",                           value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)",     value: "AIDS"  },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML"  },
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
      <div className="mt-3 text-[var(--text-dim)] transition-colors">
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
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-[var(--text-dim)]"
            />
            <select 
              value={difficultyFilter}
              onChange={e => setDifficultyFilter(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
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
            <div className="p-6 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-subtle)] text-center text-[var(--text-dim)] transition-colors">
              <div className="text-3xl mb-2">📋</div>
              <p className="font-bold mb-2 text-[var(--text-main)] transition-colors">
                Profile Incomplete
              </p>
              <p className="text-[0.82rem] mb-4">
                Your Academic Year or Department is not set. Complete your profile to see quizzes.
              </p>
              <button
                onClick={() => nav("/verify")}
                className="px-5 py-2 rounded-full border-none bg-indigo-600 text-white font-bold text-[0.8rem] cursor-pointer hover:bg-indigo-500 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                Complete Profile →
              </button>
            </div>
          ) : filteredQuizzes.length === 0 ? (
            <Empty text="No quizzes match your criteria." />
          ) : (
            <div className="grid gap-4">
              {bypassFilters && (
                <div className="rounded-lg bg-indigo-600/10 border border-indigo-500/30 p-3 text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center justify-between transition-colors">
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
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] backdrop-blur-xl p-6 group transition-colors shadow-sm hover:shadow-md transition-all">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl transition-all duration-300 group-hover:scale-110" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl transition-all duration-300 group-hover:scale-110" />

            {/* Header row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-indigo-600 dark:text-indigo-300 transition-colors">
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  Supercharge your revisions
                </div>
                <h3 className="mt-3 text-2xl font-extrabold text-[var(--text-main)] transition-colors">
                  Practice smarter with <span className="text-indigo-600">Quizify</span>
                </h3>
                <p className="mt-1 text-sm text-[var(--text-dim)] transition-colors">
                  Build bite-sized quizzes from your topics, get instant feedback, and track mastery.
                </p>
              </div>

              <div className="shrink-0">
                <a
                  href="https://jinsu-quizify-ai.netlify.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 active:scale-95"
                  aria-label="Open Quizify in a new tab"
                >
                  Launch Quizify
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                    <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
                <div className="mt-2 text-[10px] text-[var(--text-dim)] text-right">Opens in a new tab</div>
              </div>
            </div>

            {/* Benefits row */}
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Benefit chip="Create" text="Turn any chapter into quick quizzes in seconds." />
              <Benefit chip="Practice" text="Adaptive repetition so weak topics rise to 100%." />
              <Benefit chip="Explain" text="Instant solutions & hints to fix mistakes fast." />
            </div>

            {/* Footer tip */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-main)] pt-4">
              <div className="text-xs text-[var(--text-dim)]">
                Tip: Do 10 questions a day to build an unstoppable streak.
              </div>
              <kbd className="rounded-md border border-[var(--border-main)] bg-[var(--bg-subtle)] px-2 py-1 text-[11px] text-[var(--text-dim)] transition-colors">
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
                className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 flex flex-col transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl group"
              >
                <div className="flex flex-col gap-1 mb-4">
                  <h4 className="font-bold text-[var(--text-main)] group-hover:text-indigo-400 transition-colors line-clamp-1">{h.quizTitle}</h4>
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider">{h.totalAttempts} Attempt{h.totalAttempts !== 1 ? 's' : ''} total</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-muted)] p-3 text-center transition-colors">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-400 mb-1">Latest</div>
                    <div className={`text-lg font-black ${h.latestScore >= 0.8 ? 'text-emerald-500' : h.latestScore >= 0.5 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {Math.round(h.latestScore * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-subtle)] border border-indigo-500/20 p-3 text-center ring-1 ring-indigo-500/20 transition-colors">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-500 mb-1">Best</div>
                    <div className={`text-lg font-black ${h.bestScore >= 0.8 ? 'text-emerald-500' : h.bestScore >= 0.5 ? 'text-amber-500' : 'text-rose-500'}`}>
                      {Math.round(h.bestScore * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-4 px-1">
                  <span>Last taken:</span>
                  <span className="font-semibold text-[var(--text-dim)]">{formatDate(h.latestDate)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => nav(`/result/${h.latestAttemptId}`)}
                    className="flex-1 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-dim)] px-3 py-2 text-xs font-bold transition-all border border-[var(--border-main)]"
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => nav(`/result/${h.bestAttemptId}`)}
                    className="flex-1 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white px-3 py-2 text-xs font-bold transition-all border border-indigo-500/20"
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
          className={`fixed top-6 right-4 z-[200] rounded-2xl px-6 py-4 text-sm font-bold shadow-2xl border animate-[fadeInUp_500ms_ease] ${
            toast.type === "error" 
              ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400" 
              : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400"
          } transition-all`}
        >
          <div className="flex items-center gap-3">
             <span className="text-xl">{toast.type === "error" ? "⚠️" : "✔️"}</span>
             {toast.msg}
          </div>
        </div>
      )}
    </Screen>
  );
}

/* ------------------------------ UI BITS ------------------------------ */

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-[var(--bg-page-from)] bg-gradient-to-br from-[var(--bg-page-from)] via-[var(--bg-page-mid)] to-[var(--bg-page-to)] text-[var(--text-main)] p-4 md:p-6 transition-colors duration-300">
      <div className="mx-auto max-w-7xl relative">
        {/* ambient glows */}
        <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-500/5 blur-3xl" />
        {children}
      </div>
    </div>
  );
}

function Header({ profile, onOpenProfile, onLogout, attempts }) {
  const user = auth.currentUser;

  return (
    <div className="flex items-center justify-between transition-colors">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 font-bold text-white shadow-lg shadow-indigo-500/20">Q</div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-main)] transition-colors">Student Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-indigo-500 font-bold text-sm transition-colors">
              Welcome back, {profile?.name || user?.displayName || user?.email}
            </p>
            {attempts?.length > 0 && (
              <button 
                onClick={() => window.location.href = `/quiz/${attempts[0].quizId}`}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 hover:bg-indigo-600 hover:text-white transition-all"
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
          className="group relative rounded-full p-0.5 bg-gradient-to-r from-indigo-500 to-indigo-700 hover:scale-105 transition-transform shadow-lg shadow-indigo-500/20"
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
            className="h-10 w-10 rounded-full object-cover border-2 border-[var(--bg-card)] transition-colors"
          />
        </button>

        <button
          onClick={onLogout}
          className="hidden sm:inline-flex rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-2 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}



function Badge({ children }) {
  return (
    <span className="px-2 py-1 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-main)] text-xs text-[var(--text-dim)] transition-colors">
      {children}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-xl font-semibold text-[var(--text-main)] opacity-90">{title}</h2>
      {children}
    </div>
  );
}

function StatCard({ label, value, className = "", icon }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] backdrop-blur-xl p-5 flex items-center gap-4 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-lg hover:border-indigo-500/30 transition-colors ${className}`}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 transition-all">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {icon}
        </svg>
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">{label}</div>
        <div className="mt-1 text-2xl font-black text-[var(--text-main)] tracking-tight transition-colors">{value}</div>
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
    quiz.difficulty === "Easy" ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5" :
    quiz.difficulty === "Hard" ? "text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/5" :
    "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5";
    
  const timeLabel = quiz.timer?.mode === "perQuestion" 
    ? `${quiz.timer.time}s / Q` 
    : quiz.timer?.mode === "total" 
      ? `${quiz.timer.time}m total` 
      : "Untimed";

  return (
    <div
      className={`relative overflow-hidden group rounded-2xl border bg-[var(--bg-card)] backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-xl ${
        isLimited ? "border-rose-900/20 grayscale-[0.5]" : "border-[var(--border-main)] hover:border-indigo-500/40"
      } ${className}`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-[var(--text-main)] group-hover:text-indigo-600 transition-colors line-clamp-1">{quiz.title}</h3>
            {attemptsMade > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 transition-colors">
                Best: {bestScore}%
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-dim)] line-clamp-2">{quiz.description || "—"}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1 relative z-10">
        <span className="px-2 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)]">
          {quiz.department} • {quiz.academicYear}
        </span>
        {quiz.difficulty && (
          <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold ${diffColor}`}>
            {quiz.difficulty}
          </span>
        )}
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[10px] uppercase tracking-wider font-semibold text-[var(--text-dim)]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {timeLabel}
        </span>
        
        {maxAttempts > 0 && (
          <span className={`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold ${
            isLimited ? "bg-rose-950/20 border-rose-800/40 text-rose-500" : "bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-dim)]"
          }`}>
            {attemptsMade} / {maxAttempts} Attempts
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-[var(--border-main)] relative z-10 transition-colors">
        <span className="text-xs text-[var(--text-dim)] font-medium">
          By {quiz.createdByName || quiz.createdBy?.slice(0, 6) || "Teacher"}
        </span>
        
        {isLimited ? (
          <div className="flex items-center gap-2 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/5 px-3 py-2 rounded-xl border border-rose-500/10 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
            Limit Reached
          </div>
        ) : (
          <button
            onClick={onStart}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 text-white px-5 py-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
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
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] p-4 transition group-hover:translate-y-[-1px] transition-colors">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-main)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
        {chip}
      </div>
      <p className="text-sm text-[var(--text-dim)]">{text}</p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 text-[var(--text-dim)] text-sm transition-colors">
      {text}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 animate-pulse transition-colors">
      <div className="h-3 w-24 bg-[var(--bg-subtle)] rounded" />
      <div className="mt-3 h-8 w-16 bg-[var(--bg-subtle)] rounded" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] p-5 animate-pulse transition-colors">
      <div className="h-4 w-1/3 bg-[var(--bg-subtle)] rounded" />
      <div className="mt-3 h-4 w-1/2 bg-[var(--bg-subtle)] rounded" />
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
      <div className={`fixed inset-0 bg-[var(--bg-overlay)] transition-opacity z-40 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`} onClick={onClose} />
      <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-[var(--bg-card)] backdrop-blur-xl border-l border-[var(--border-main)] transition-transform duration-300 z-50 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)]">
          <h3 className="text-lg font-semibold text-[var(--text-main)]">Your Profile</h3>
          <button onClick={onClose} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-subtle)] px-3 py-1.5 hover:bg-[var(--bg-muted)] text-[var(--text-dim)] transition font-bold text-xs uppercase">Close</button>
        </div>

        <div className="h-[calc(100vh-58px)] overflow-y-auto overscroll-contain p-4">
          <div className="flex flex-col items-center mt-4 mb-8">
            <div className="relative group cursor-pointer">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full blur opacity-25" />
              <img src={avatarSrc} alt="avatar" className="relative h-24 w-24 rounded-full object-cover border-2 border-[var(--border-main)] shadow-xl" />
              <div className="absolute inset-0 bg-[var(--bg-overlay)] rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => fileRef.current?.click()} className="text-white text-[10px] font-bold uppercase tracking-wider mb-1 hover:scale-110 transition-transform">Upload</button>
                <button onClick={useGooglePhoto} className="text-white/80 text-[9px] uppercase tracking-wider hover:scale-110 transition-transform">Google</button>
                <input ref={fileRef} onChange={(e) => handleUpload(e.target.files?.[0])} type="file" accept="image/*" className="hidden" />
              </div>
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-[var(--text-main)]">{profile?.name}</h2>
            <p className="text-sm text-indigo-500 font-medium">{profile?.regNo || "No Reg No"}</p>
          </div>

          <div className="space-y-6">
            <div>
              <h4 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-3 px-1 transition-colors">Academic Context</h4>
              <div className="bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl p-1 transition-colors">
                <LockedField label="Institute" value={profile?.institute} />
                <LockedField label="Department" value={DEPARTMENTS.find(d => d.value === profile?.department)?.label || profile?.department} />
                <LockedField label="Academic Year" value={profile?.academicYear} />
              </div>
            </div>

            <div>
              <h4 className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-bold mb-3 px-1 transition-colors">Personal Info</h4>
              <div className="bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl p-1 transition-colors">
                <LockedField label="Full Name" value={profile?.name} />
                <LockedField label="Date of Birth" value={profile?.dob} />
                <LockedField label="Gender" value={profile?.gender} />
              </div>
            </div>

            <div className="pt-6 flex flex-wrap gap-3 justify-between items-center border-t border-[var(--border-main)] transition-colors">
              <button
                type="button"
                onClick={() => setReqOpen(true)}
                disabled={checkingPending || hasPending}
                className={`rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide transition-all ${hasPending ? "bg-[var(--bg-muted)] text-[var(--text-muted)] cursor-not-allowed border-[var(--border-main)]" : "bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white"}`}
              >
                {hasPending ? "Request Pending" : "Request Edit"}
              </button>
              <div className="flex gap-2">
                <button onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors">Cancel</button>
                <button disabled={saving} onClick={save} className="rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {reqOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center p-4">
          <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={() => setReqOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] shadow-2xl overflow-hidden animate-[fadeIn_200ms_ease] transition-colors">
            <div className="p-5 border-b border-[var(--border-main)] sticky top-0 bg-[var(--bg-card)] z-10">
              <h4 className="text-lg font-bold text-[var(--text-main)]">Request Edit Permission</h4>
              <p className="text-sm text-[var(--text-dim)] mt-1">Select fields and enter the new data for teacher approval.</p>
            </div>
            
            <div className="p-5 max-h-[400px] overflow-y-auto overscroll-contain transition-colors">
              <div className="flex flex-col gap-3">
                {LOCKED_FIELDS.map((f) => (
                  <div key={f} className="flex flex-col gap-2 rounded-xl bg-[var(--bg-subtle)] p-3 border border-[var(--border-main)] transition-colors">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-500 rounded"
                        checked={!!reqFields[f]}
                        onChange={(e) => setReqFields({ ...reqFields, [f]: e.target.checked })}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-dim)]">
                        {f === "regNo" ? "Register Number" : f === "dob" ? "Date of Birth" : f === "academicYear" ? "Academic Year" : f}
                      </span>
                    </label>

                    {reqFields[f] && (
                      <div className="mt-1">
                        {f === "department" ? (
                          <select 
                            value={reqValues[f]} 
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            className="w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                          >
                            {DEPARTMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                          </select>
                        ) : f === "gender" ? (
                          <select 
                            value={reqValues[f]} 
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            className="w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                          >
                            {["Male", "Female", "Other", "Prefer not to say"].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        ) : (
                          <input
                            type={f === "dob" ? "date" : "text"}
                            value={reqValues[f]}
                            onChange={(e) => setReqValues({ ...reqValues, [f]: e.target.value })}
                            placeholder={`New ${f}...`}
                            className="w-full rounded-lg bg-[var(--bg-input)] border border-[var(--border-input)] px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500 transition-all transition-colors"
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Reason for Request</label>
                <textarea
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-indigo-500 transition-all transition-colors"
                  placeholder="Explain why you need this change..."
                />
              </div>
            </div>

            <div className="p-5 border-t border-[var(--border-main)] bg-[var(--bg-card)] flex justify-end gap-3 sticky bottom-0 z-10 transition-colors">
              <button onClick={() => setReqOpen(false)} className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] px-5 py-2.5 text-xs font-bold uppercase text-[var(--text-dim)] hover:bg-[var(--bg-muted)] transition-all transition-colors">Cancel</button>
              <button onClick={submitRequest} disabled={saving} className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 text-xs font-bold uppercase transition disabled:bg-[var(--bg-muted)] disabled:text-[var(--text-muted)]">{saving ? "Submitting..." : "Submit Request"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col p-3 border-b border-[var(--border-main)] last:border-0 transition-colors">
      <label className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] opacity-70">
        {label}
      </label>
      <div className="text-sm font-medium text-[var(--text-main)] transition-colors">
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