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
  const { fbUser, profile, loading } = useAuth();
  const nav = useNavigate();

  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [busyQuizzes, setBusyQuizzes] = useState(true);
  const [openProfile, setOpenProfile] = useState(false);

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

  // Load quizzes (filter by student's dept & year)
  useEffect(() => {
    (async () => {
      if (!profile || profile.role !== "student") return;
      setBusyQuizzes(true);
      try {
        const qz = query(
          collection(db, "quizzes"),
          where("department", "==", profile.department || ""),
          where("academicYear", "==", profile.academicYear || ""),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(qz);
        setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Load quizzes error:", e);
        setToast({ type: "error", msg: "Could not load quizzes. Please refresh." });
      } finally {
        setBusyQuizzes(false);
      }
    })();
  }, [profile]);

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
        setToast({ type: "error", msg: "Could not load quiz history." });
      }
    );
    return () => unsub();
  }, [fbUser]);

  const stats = useMemo(() => computeStats(attempts), [attempts]);

  if (loading || !profile) {
    return (
      <Screen>
        <Header profile={profile} onOpenProfile={() => setOpenProfile(true)} />
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
      <Header profile={profile} onOpenProfile={() => setOpenProfile(true)} />

      {/* Stats Row */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total Attempts"
          value={stats.totalAttempts}
          className="opacity-0 animate-[fadeInUp_500ms_ease_100ms_forwards]"
        />
        <StatCard
          label="Average Score"
          value={`${stats.avg}%`}
          className="opacity-0 animate-[fadeInUp_500ms_ease_200ms_forwards]"
        />
        <StatCard
          label="Best Score"
          value={`${stats.best}%`}
          className="opacity-0 animate-[fadeInUp_500ms_ease_300ms_forwards]"
        />
      </div>

      {/* Context badges */}
      <div className="mt-3 text-gray-300">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <Badge>{profile.institute}</Badge>
          <Badge>{profile.academicYear}</Badge>
          <Badge>Dept: {profile.department}</Badge>
          {profile.regNo ? <Badge>Reg No: {profile.regNo}</Badge> : null}
        </div>
      </div>

      {/* Main Grid: Quizzes + Quizify CTA */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Available Quizzes">
          {busyQuizzes ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : quizzes.length === 0 ? (
            <Empty text="No quizzes published yet for your department / academic year." />
          ) : (
            <div className="grid gap-4">
              {quizzes.map((qz, i) => (
                <QuizCard
                  key={qz.id}
                  quiz={qz}
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
                    <path d="M7 17L17 7M17 7H9M17 7V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
      <Section title="Recent Attempts">
        {attempts.length === 0 ? (
          <Empty text="You haven't attempted any quiz yet." />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-800/60 text-gray-400">
                <tr>
                  <th className="px-4 py-3">Quiz</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">View</th>
                </tr>
              </thead>
              <tbody>
                {attempts.slice(0, 8).map((a) => (
                  <tr key={a.id} className="border-t border-gray-800/70">
                    <td className="px-4 py-3">{a.quizTitle || a.quizId}</td>
                    <td className="px-4 py-3">
                      {a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%)
                    </td>
                    <td className="px-4 py-3">{formatDate(a.completedAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => nav(`/result/${a.id}`)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 hover:bg-gray-700 transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Profile Drawer */}
      <ProfileDrawer
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        profile={profile}
      />

      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed top-6 right-4 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.type === "error" ? "bg-red-600" : "bg-green-600"
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

function Header({ profile, onOpenProfile }) {
  const user = auth.currentUser;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 font-bold">Q</div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Student Dashboard</h1>
          <p className="text-gray-400 text-sm">
            Welcome {user?.displayName || profile?.name || user?.email}
          </p>
        </div>
      </div>

      {/* Right: Quick Stats + Avatar */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          <Pill label="Avg" value={`${profile?.averageScore ?? 0}%`} />
          <Pill label="Quizzes" value={`${profile?.totalQuizzes ?? 0}`} />
        </div>

        <button
          onClick={onOpenProfile}
          className="group relative rounded-full p-1 border border-gray-700 bg-gray-800 hover:bg-gray-700 transition"
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
            className="h-10 w-10 rounded-full object-cover"
          />
          <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition">
            Edit
          </span>
        </button>
      </div>
    </div>
  );
}

function Pill({ label, value }) {
  return (
    <div className="rounded-full border border-gray-700 bg-gray-800/70 px-3 py-1 text-xs text-gray-200">
      <span className="text-gray-400">{label}:</span>{" "}
      <span className="font-semibold">{value}</span>
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

function StatCard({ label, value, className = "" }) {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-5 transition hover:translate-y-[-1px] hover:shadow-[0_10px_40px_-20px_rgba(59,130,246,0.5)] ${className}`}
    >
      <div className="text-sm text-gray-400">{label}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function QuizCard({ quiz, onStart, className = "", style = {} }) {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-5 flex flex-col gap-2 transition hover:translate-y-[-1px] hover:shadow-[0_10px_40px_-20px_rgba(79,70,229,0.5)] ${className}`}
      style={style}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{quiz.title}</h3>
          <p className="text-sm text-gray-400">{quiz.description || "—"}</p>
        </div>
        <span className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs text-gray-300">
          {quiz.department} • {quiz.academicYear}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          By {quiz.createdByName || quiz.createdBy?.slice(0, 6) || "Teacher"}
        </span>
        <button
          onClick={onStart}
          className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold transition"
        >
          Start Quiz
        </button>
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

function ProfileDrawer({ open, onClose, profile }) {
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
  const [hasPending, setHasPending] = useState(false);
  const [checkingPending, setCheckingPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhotoURL(profile?.photoURL || "");
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

  // client-side compression -> base64 data URL (no Storage required)
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
      const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
      if (approxBytes > 300 * 1024) {
        alert("Please choose a smaller image (target < 300KB after compression).");
        setUploading(false);
        return;
      }
      setPhotoURL(dataUrl);
    } catch (e) {
      console.error("Compress error:", e);
      alert("Could not process the image. Try a smaller file.");
    } finally {
      setUploading(false);
    }
  };

  const useGooglePhoto = () => {
    const googleUrl = auth.currentUser?.photoURL || "";
    if (!googleUrl) return alert("No Google photo found for this account.");
    setPhotoURL(googleUrl);
  };

  const save = async () => {
    if (!fbUser) return;
    setSaving(true);
    try {
      // Only persist photoURL here; all other fields are locked and require approval workflows
      await setDoc(
        doc(db, "users", fbUser.uid),
        { photoURL: photoURL || null },
        { merge: true }
      );
      onClose();
    } catch (e) {
      console.error("Profile save error:", e);
      alert("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submitRequest = async () => {
    if (!fbUser) return;
    const fields = Object.entries(reqFields)
      .filter(([k, v]) => v)
      .map(([k]) => k);

    if (!fields.length) return alert("Select at least one field to request edit.");
    if (!reqReason.trim()) return alert("Please add a short reason.");

    try {
      // prevent duplicates
      const qy = query(
        collection(db, "editRequests"),
        where("userId", "==", fbUser.uid),
        where("status", "==", "pending")
      );
      const snap = await getDocs(qy);
      if (!snap.empty) {
        setHasPending(true);
        setReqOpen(false);
        return;
      }

      await addDoc(collection(db, "editRequests"), {
        userId: fbUser.uid,
        userEmail: fbUser.email || null,
        institute: profile?.institute || null,
        department: profile?.department || null,
        academicYear: profile?.academicYear || null,
        fields, // e.g., ["name","dob","regNo","gender","institute","academicYear","department"]
        reason: reqReason.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });

      setHasPending(true);
      setReqOpen(false);
      setReqFields(LOCKED_FIELDS.reduce((acc, k) => ({ ...acc, [k]: false }), {}));
      setReqReason("");
      alert("Edit request submitted for approval.");
    } catch (e) {
      console.error("submitRequest error:", e);
      alert("Could not submit request. Please try again.");
    }
  };

  const avatarSrc =
    photoURL ||
    profile?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      profile?.name || "User"
    )}&background=0D8ABC&color=fff`;

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full max-w-md transform bg-gray-950/95 backdrop-blur-xl border-l border-gray-800 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header (sticky) */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold">Your Profile</h3>
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>

        {/* Content: full-height scrollable area */}
        <div className="h-[calc(100dvh-58px)] overflow-y-auto overscroll-contain">
          <div className="p-4">
            <div className="mx-auto max-w-lg md:scale-[0.96] md:origin-top transition">
              <div className="space-y-5">
                {/* Avatar + Upload */}
                <div className="flex items-center gap-4">
                  <img
                    src={avatarSrc}
                    alt="avatar"
                    className="h-16 w-16 rounded-full object-cover border border-gray-800"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm transition"
                    >
                      {uploading ? "Uploading…" : "Upload Photo"}
                    </button>
                    <button
                      onClick={useGooglePhoto}
                      className="rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 text-sm transition"
                    >
                      Use Google photo
                    </button>
                    <input
                      ref={fileRef}
                      onChange={(e) => handleUpload(e.target.files?.[0])}
                      type="file"
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Locked fields (display-only) */}
                <LockedField label="Full Name" value={profile?.name} />
                <LockedField label="Date of Birth" value={profile?.dob} />
                <LockedField label="Gender" value={profile?.gender} />
                <LockedField label="Institute" value={profile?.institute} />
                <LockedField label="Register Number" value={profile?.regNo} />
                <LockedField label="Academic Year" value={profile?.academicYear} />
                <LockedField
                  label="Department"
                  value={
                    DEPARTMENTS.find((d) => d.value === profile?.department)?.label ||
                    profile?.department ||
                    "—"
                  }
                />

                {/* Actions */}
                <div className="pt-2 flex flex-wrap gap-2 justify-between">
                  <button
                    type="button"
                    onClick={() => setReqOpen(true)}
                    disabled={checkingPending || hasPending}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                      hasPending
                        ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                    title={
                      hasPending
                        ? "An edit request is already pending approval"
                        : "Request permission to edit locked fields"
                    }
                  >
                    {hasPending ? "Edit Request Pending" : "Request Edit"}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={saving}
                      onClick={save}
                      className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
                        saving
                          ? "bg-gray-600 text-gray-300"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-700/30"
                      }`}
                    >
                      {saving ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Edit Request Modal */}
              {reqOpen && (
                <div className="fixed inset-0 z-10 grid place-items-center">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setReqOpen(false)} />
                  <div className="relative w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur-xl p-5 animate-[fadeIn_200ms_ease]">
                    <h4 className="text-lg font-semibold">Request Edit Permission</h4>
                    <p className="text-sm text-gray-400 mt-1">
                      Select the fields you want to edit and tell your teacher/admin why.
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-200">
                      {LOCKED_FIELDS.map((f) => (
                        <label key={f} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            className="accent-blue-600"
                            checked={!!reqFields[f]}
                            onChange={(e) =>
                              setReqFields({ ...reqFields, [f]: e.target.checked })
                            }
                          />
                          <span className="capitalize">
                            {f === "regNo"
                              ? "Register Number"
                              : f === "dob"
                              ? "Date of Birth"
                              : f === "academicYear"
                              ? "Academic Year"
                              : f}
                          </span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-xs text-gray-300">Reason</label>
                      <textarea
                        value={reqReason}
                        onChange={(e) => setReqReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800/90 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Briefly explain why you need this change…"
                      />
                    </div>

                    <div className="mt-5 flex justify-end gap-2">
                      <button
                        onClick={() => setReqOpen(false)}
                        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitRequest}
                        className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-sm font-semibold transition"
                      >
                        Submit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* --- helper: compress to Data URL (no server, no Storage) --- */

async function compressToDataURL(
  file,
  { maxWidth = 512, maxHeight = 512, quality = 0.8, mimeType = "image/jpeg" } = {}
) {
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

/* ------------------------------ SMALL INPUTS ------------------------------ */

function LockedField({ label, value }) {
  return (
    <div className="flex flex-col">
      <label className="mb-1 text-xs font-medium text-gray-400 tracking-wide">
        {label} (locked)
      </label>
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 px-4 py-3 text-[15px] text-gray-300">
        {value || "—"}
      </div>
    </div>
  );
}

/* ------------------------------ HELPERS ------------------------------ */

function computeStats(attempts) {
  if (!attempts.length) return { totalAttempts: 0, avg: 0, best: 0 };
  const totals = attempts.map((a) => ({
    pct: Math.round((a.score / a.total) * 100),
    when: tsToMillis(a.completedAt),
  }));
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
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
