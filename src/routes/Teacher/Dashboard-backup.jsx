// src/routes/teacher/Dashboard.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut, updateProfile } from "firebase/auth";
/* --------------------------------- CONSTS --------------------------------- */

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




const ACADEMIC_YEARS = ["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"];
const MIN_Q = 1, MAX_Q = 100;
const MIN_OPT = 2, MAX_OPT = 10;
const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 5;

export default function TeacherDashboard() {
  // 1. Get the *initial* profile from the hook
  const { fbUser, profile: initialProfile, loading } = useAuth();
  const nav = useNavigate();

  // 2. Create a *live* profile state
  const [profile, setProfile] = useState(initialProfile);

  // 3. Add the real-time listener
  useEffect(() => {
    // If we get a new initial profile (e.g., on login), update our live state
    setProfile(initialProfile);
  }, [initialProfile]);

  useEffect(() => {
    // Listen for live changes to the user's document
    if (!fbUser?.uid) return;

    const userDocRef = doc(db, "users", fbUser.uid);
    const unsub = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data()); // Update live state on any change
      }
    }, (err) => {
      console.error("Profile snapshot error:", err);
    });

    return () => unsub(); // Stop listening when component unmounts
  }, [fbUser?.uid]); // Re-subscribe if the user ID changes

  // Mode switching
  const [createMode, setCreateMode] = useState("custom"); // "ai" or "custom"
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Unlimited

  // AI Quiz Generation state
  const [aiMode, setAiMode] = useState("topic"); // 'topic' | 'file'
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("Create a multiple-choice quiz based on the provided text.");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOptions, setNumOptions] = useState(4);
  const [difficulty, setDifficulty] = useState("Moderate");
  const [timerMode, setTimerMode] = useState("off"); // 'off' | 'perQuestion' | 'total'
  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)


  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiQuiz, setAiQuiz] = useState(null); // {questions: [...], meta:{...}}
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef(null);

  // Custom quiz form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    academicYear: "",
  });
  const [questions, setQuestions] = useState([
    {
      question: "",
      options: ["", "", "", ""],
      answerIndex: 0, // store index of correct option
      explanation: "",
    },
  ]);

  // Listing state
  const [busyCreate, setBusyCreate] = useState(false);
  const [busyList, setBusyList] = useState(true);
  const [quizzes, setQuizzes] = useState([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");

  // Edit Requests state
  const [requests, setRequests] = useState([]);
  const [busyReqs, setBusyReqs] = useState(false);

  // Profile drawer
  const [openProfile, setOpenProfile] = useState(false);

  // Toast
  const [toast, setToast] = useState({ type: "", msg: "" });
  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Pre-fill teacher meta from user profile
  const teacherMeta = useMemo(() => {
    return {
      displayName: fbUser?.displayName || fbUser?.email?.split("@")[0] || "Teacher",
      uid: fbUser?.uid || "",
      institute: profile?.institute || null,
      department: profile?.department || null,
      name: profile?.name || null,
      dob: profile?.dob || null,
      gender: profile?.gender || null,
      photoURL: profile?.photoURL || null,
    };
  }, [fbUser, profile]);

  useEffect(() => {
    // sensible defaults for timer input when switching modes
    if (timerMode === "perQuestion") setTimeValue((t) => Math.max(10, t || 30));
    if (timerMode === "total") setTimeValue((t) => Math.max(1, t || 10));
  }, [timerMode]);

  // Route guard
  useEffect(() => {
    if (loading) return;
    if (!fbUser) return nav("/signin", { replace: true });
    if (!profile || !profile.role) return nav("/role", { replace: true });
    if (profile.role !== "teacher") return nav("/student", { replace: true });
  }, [fbUser, profile, loading, nav]);

  // Subscribe teacher's quizzes (own only)
  useEffect(() => {
    if (!fbUser) return;
    setBusyList(true);
    const qRef = query(
      collection(db, "quizzes"),
      where("createdBy", "==", fbUser.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (ss) => {
        setQuizzes(ss.docs.map((d) => ({ id: d.id, ...d.data() })));
        setBusyList(false);
      },
      (e) => {
        console.error("Quizzes sub error:", e);
        setBusyList(false);
        setToast({ type: "error", msg: "Could not load your quizzes." });
      }
    );
    return () => unsub();
  }, [fbUser]);

  // Subscribe to pending edit requests for this teacher's department
  useEffect(() => {
    if (!profile?.department) {
      setRequests([]);
      setBusyReqs(false);
      return;
    }
    setBusyReqs(true);

    // Try compound query first; if index missing, fall back to single-field query + client filter
    const tryCompoundQuery = () => {
      const rRef = query(
        collection(db, "editRequests"),
        where("department", "==", profile.department),
        where("status", "==", "pending")
      );
      return onSnapshot(
        rRef,
        (ss) => {
          setRequests(
            ss.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
          );
          setBusyReqs(false);
        },
        (e) => {
          console.warn("Compound query failed (likely missing index), falling back:", e.message);
          // Fallback: query by status only, then filter client-side
          fallbackQuery();
        }
      );
    };

    const fallbackQuery = () => {
      const rRef = query(
        collection(db, "editRequests"),
        where("status", "==", "pending")
      );
      return onSnapshot(
        rRef,
        (ss) => {
          const all = ss.docs.map((d) => ({ id: d.id, ...d.data() }));
          const filtered = all.filter((r) => r.department === profile.department);
          setRequests(
            filtered.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
          );
          setBusyReqs(false);
        },
        (e) => {
          console.error("Requests fallback error:", e);
          if (e.code?.toString().includes("permission")) {
            console.error("🔴 FIRESTORE PERMISSIONS ERROR: Your Security Rules are blocking 'editRequests'. Ensure teachers have read access in Firebase Console.");
          }
          setBusyReqs(false);
        }
      );
    };

    const unsub = tryCompoundQuery();
    return () => { if (typeof unsub === "function") unsub(); };
  }, [profile?.department]);

  // Derived: filtered quizzes
  const filtered = useMemo(() => {
    let rows = quizzes;
    if (filterDept) rows = rows.filter((r) => r.department === filterDept);
    if (filterYear) rows = rows.filter((r) => r.academicYear === filterYear);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title?.toLowerCase().includes(s) ||
          r.description?.toLowerCase().includes(s)
      );
    }
    return rows;
  }, [quizzes, search, filterDept, filterYear]);

  /* --------------------------------- AI QUIZ ACTIONS -------------------------------- */

  const clampedNumQ = (v) => Math.max(MIN_Q, Math.min(MAX_Q, Number(v || 0)));
  const clampedNumOpt = (v) => Math.max(MIN_OPT, Math.min(MAX_OPT, Number(v || 0)));

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/(\.txt|\.csv)$/i.test(f.name)) {
      alert("Please upload a .txt or .csv file.");
      return;
    }
    setFile(f);
  };

  const generateWithAI = async (e) => {
    e?.preventDefault?.();
    setAiLoading(true);
    setAiError("");
    setAiQuiz(null);

    try {
      const timerSettings = { mode: timerMode, time: timeValue };
      let requestOptions;

      if (aiMode === "file") {
        if (!file) throw new Error("Please select a file for File mode.");
        if (!instruction.trim()) throw new Error("Please add an instruction for File mode.");
        const fd = new FormData();
        fd.append("file", file);
        fd.append("config", JSON.stringify({
          instruction,
          numQuestions: clampedNumQ(numQuestions),
          numOptions: clampedNumOpt(numOptions),
          difficulty,
        }));
        requestOptions = { method: "POST", body: fd };
      } else {
        if (!topic.trim()) throw new Error("Please enter a topic for Topic mode.");
        requestOptions = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: topic.trim(),
            numQuestions: clampedNumQ(numQuestions),
            numOptions: clampedNumOpt(numOptions),
            difficulty,
          }),
        };
      }

      const res = await fetch("/.netlify/functions/generateQuiz", requestOptions);
      const raw = await res.text();

      if (!res.ok) {
        let msg = "Failed to generate quiz.";
        try { msg = JSON.parse(raw).error || msg; } catch { }
        throw new Error(msg);
      }

      const questionsData = JSON.parse(raw);
      if (!Array.isArray(questionsData) || questionsData.length === 0) {
        throw new Error("AI returned an empty or invalid quiz.");
      }

      // Transform AI questions to match our editing format
      const editableQuestions = questionsData.map(q => ({
        question: q.question,
        options: q.options || ["", "", "", ""],
        answerIndex: q.options?.findIndex(opt => opt === q.answer) || 0,
        explanation: q.explanation || "",
      }));

      setAiQuiz({
        questions: editableQuestions,
        meta: {
          difficulty,
          timer: timerSettings,
          sourceMode: aiMode,
          topic: aiMode === "file" ? (file?.name || "Uploaded Document") : topic.trim(),
          createdPreviewAt: Date.now(),
        },
      });
    } catch (err) {
      console.error("AI generation error:", err);
      setAiError(err.message || "AI generation failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const updateAiQuestion = (idx, patch) => {
    setAiQuiz((q) => {
      const copy = { ...q, questions: [...q.questions] };
      copy.questions[idx] = { ...copy.questions[idx], ...patch };
      return copy;
    });
  };

  const removeAiQuestion = (idx) => {
    setAiQuiz((q) => {
      const copy = { ...q, questions: q.questions.filter((_, i) => i !== idx) };
      return copy;
    });
  };

  const updateAiOption = (qi, oi, value) => {
    setAiQuiz((q) => {
      const copy = { ...q, questions: [...q.questions] };
      const ops = [...copy.questions[qi].options];
      ops[oi] = value;
      copy.questions[qi].options = ops;
      return copy;
    });
  };

  const publishAiQuiz = async () => {
    if (!aiQuiz || !aiQuiz.questions?.length) {
      alert("Please generate a quiz before publishing.");
      return;
    }
    if (!teacherMeta.department || !teacherMeta.academicYear) {
      alert("Your profile is missing Department or Academic Year. Please ask admin to set these.");
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title: aiQuiz.meta.topic || "Untitled Quiz",
        description: `AI-generated ${aiQuiz.meta.difficulty} quiz • ${aiQuiz.questions.length} questions`,
        department: teacherMeta.department,
        academicYear: teacherMeta.academicYear,
        institute: teacherMeta.institute || null,
        difficulty: aiQuiz.meta.difficulty,
        timer: aiQuiz.meta.timer,
        createdBy: teacherMeta.uid,
        createdByName: teacherMeta.displayName,
        createdAt: serverTimestamp(),
        sourceMode: aiQuiz.meta.sourceMode,
        maxAttempts: Number(maxAttempts) || 0,
        questions: aiQuiz.questions.map(q => ({
          question: q.question.trim(),
          options: q.options.map(o => o.trim()),
          answer: q.options[q.answerIndex]?.trim() ?? "",
          explanation: q.explanation.trim(),
        })),
      };

      console.log("[DEBUG] Publishing quiz with metadata:", {
        title: payload.title,
        dept: payload.department,
        year: payload.academicYear
      });

      const ref = await addDoc(collection(db, "quizzes"), payload);
      await setDoc(doc(db, "users", teacherMeta.uid, "teacherQuizzes", ref.id), {
        quizId: ref.id,
        title: payload.title,
        createdAt: serverTimestamp(),
        department: payload.department,
        academicYear: payload.academicYear,
      });

      alert("Quiz published! It will appear on students' dashboards for your Department & Academic Year.");
      setAiQuiz(null);
    } catch (e) {
      console.error("Publish error:", e);
      alert("Could not publish quiz. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  /* --------------------------------- CUSTOM QUIZ ACTIONS -------------------------------- */

  const addQuestion = () => {
    setQuestions((qs) => [
      ...qs,
      {
        question: "",
        options: ["", "", "", ""],
        answerIndex: 0,
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (i) => {
    setQuestions((qs) => (qs.length > 1 ? qs.filter((_, idx) => idx !== i) : qs));
  };

  const updateQuestion = (i, patch) => {
    setQuestions((qs) => {
      const nx = [...qs];
      nx[i] = { ...nx[i], ...patch };
      return nx;
    });
  };

  const updateOption = (qi, oi, value) => {
    setQuestions((qs) => {
      const nx = [...qs];
      const ops = [...nx[qi].options];
      ops[oi] = value;
      nx[qi].options = ops;
      return nx;
    });
  };

  const createQuiz = async () => {
    if (!fbUser) return;
    // basic validations
    if (!form.title.trim()) return setToast({ type: "error", msg: "Title is required." });
    if (!form.department || !form.academicYear)
      return setToast({ type: "error", msg: "Select department & year." });
    for (const q of questions) {
      if (!q.question.trim()) return setToast({ type: "error", msg: "Fill all questions." });
      if (q.options.some((o) => !o.trim()))
        return setToast({ type: "error", msg: "Fill all options." });
    }

    setBusyCreate(true);
    try {
      const timerSettings = { mode: timerMode, time: timeValue };
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || "",
        createdBy: teacherMeta.uid,
        createdByName: teacherMeta.displayName,
        department: form.department,
        academicYear: form.academicYear,
        institute: teacherMeta.institute || null,
        difficulty: difficulty,
        timer: timerSettings,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          answer: q.options[q.answerIndex]?.trim() ?? "",
          explanation: q.explanation.trim(),
        })),
        createdAt: serverTimestamp(),
        sourceMode: "custom",
        maxAttempts: Number(maxAttempts) || 0,
      };

      console.log("[DEBUG] Custom quiz creating with:", {
        title: payload.title,
        dept: payload.department,
        year: payload.academicYear
      });

      const ref = await addDoc(collection(db, "quizzes"), payload);
      await setDoc(doc(db, "users", teacherMeta.uid, "teacherQuizzes", ref.id), {
        quizId: ref.id,
        title: payload.title,
        createdAt: serverTimestamp(),
        department: payload.department,
        academicYear: payload.academicYear,
      });

      setToast({ type: "ok", msg: "Quiz created." });
      // reset minimal
      setForm({ title: "", description: "", department: "", academicYear: "" });
      setMaxAttempts(0);
      setQuestions([
        { question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" },
      ]);
    } catch (e) {
      console.error("Create quiz error:", e);
      setToast({ type: "error", msg: "Failed to create quiz." });
    } finally {
      setBusyCreate(false);
    }
  };

  /* --------------------------------- QUIZ MANAGEMENT ACTIONS -------------------------------- */

  const deleteQuiz = async (quizId) => {
    if (!confirm("Delete this quiz permanently?")) return;
    try {
      await deleteDoc(doc(db, "quizzes", quizId));
      setToast({ type: "ok", msg: "Quiz deleted." });
    } catch (e) {
      console.error("Delete error:", e);
      setToast({ type: "error", msg: "Failed to delete quiz." });
    }
  };

  const duplicateQuiz = async (quiz) => {
    try {
      const copy = {
        ...quiz,
        title: `${quiz.title} (Copy)`,
        createdAt: serverTimestamp(),
      };
      delete copy.id;
      await addDoc(collection(db, "quizzes"), copy);
      setToast({ type: "ok", msg: "Quiz duplicated." });
    } catch (e) {
      console.error("Duplicate error:", e);
      setToast({ type: "error", msg: "Failed to duplicate." });
    }
  };

  const editQuiz = (quiz) => {
    // Load quiz into AI quiz editor for editing
    const editableQuestions = quiz.questions.map(q => ({
      question: q.question,
      options: q.options || ["", "", "", ""],
      answerIndex: q.options?.findIndex(opt => opt === q.answer) || 0,
      explanation: q.explanation || "",
    }));

    setAiQuiz({
      questions: editableQuestions,
      meta: {
        difficulty: quiz.difficulty || "Moderate",
        timer: quiz.timer || { mode: "off", time: 30 },
        sourceMode: quiz.sourceMode || "custom",
        topic: quiz.title,
        createdPreviewAt: Date.now(),
        editingId: quiz.id, // Mark as editing existing quiz
      },
    });

    // --- FIX 1 of 2: Populate form state when editing ---
    // Populate the AI form with the quiz's current data so it can be edited.
    setTopic(quiz.title);
    setDifficulty(quiz.difficulty || "Moderate");
    setTimerMode(quiz.timer?.mode || "off");
    setTimeValue(quiz.timer?.time || (quiz.timer?.mode === "total" ? 10 : 30));
    setMaxAttempts(quiz.maxAttempts || 0);
    // --- END OF FIX ---

    setCreateMode("ai"); // Switch to AI mode for editing
  };

  const updateExistingQuiz = async () => {
    if (!aiQuiz || !aiQuiz.questions?.length || !aiQuiz.meta.editingId) {
      alert("Invalid quiz data for updating.");
      return;
    }

    setPublishing(true);
    try {
      // --- FIX 2 of 2: Read from form state when updating ---
      // The payload must read from the *current form state* (topic, difficulty, etc.)
      // not just the meta object, which might be stale.
      const timerSettings = { mode: timerMode, time: timeValue };

      const payload = {
        title: topic.trim() || "Untitled Quiz", // Get from form state
        description: `Updated quiz • ${aiQuiz.questions.length} questions`,
        difficulty: difficulty, // Get from form state
        timer: timerSettings, // Get from form state
        questions: aiQuiz.questions.map(q => ({
          question: q.question.trim(),
          options: q.options.map(o => o.trim()),
          answer: q.options[q.answerIndex]?.trim() ?? "",
          explanation: q.explanation.trim(),
        })),
        maxAttempts: Number(maxAttempts) || 0,
        updatedAt: serverTimestamp(),
      };
      // --- END OF FIX ---

      await updateDoc(doc(db, "quizzes", aiQuiz.meta.editingId), payload);
      alert("Quiz updated successfully!");
      setAiQuiz(null);
    } catch (e) {
      console.error("Update error:", e);
      alert("Could not update quiz. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <Screen>
      <Header
        profile={profile}
        fbUser={fbUser}
        onOpenProfile={() => setOpenProfile(true)}
      />

      {/* Mode Selection Tabs */}
      <div className="mt-8 border-b border-gray-800">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {[
            { key: "ai", label: "AI Quiz Generator" },
            { key: "custom", label: "Custom Quiz Creator" },
            { key: "requests", label: `Student Requests ${requests.length > 0 ? `(${requests.length})` : ""}` }
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => setCreateMode(mode.key)}
              className={`relative pb-4 text-sm font-bold transition-colors whitespace-nowrap ${createMode === mode.key
                ? "text-indigo-400"
                : "text-gray-400 hover:text-gray-200"
                }`}
            >
              {mode.label}
              {createMode === mode.key && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-[fadeIn_0.3s_ease]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Left Column - Creation Panel OR Requests */}
        <div>
          {createMode === "requests" ? (
            <StudentRequestsSection requests={requests} busyReqs={busyReqs} />
          ) : createMode === "ai" ? (

            <AiQuizSection
              aiMode={aiMode}
              setAiMode={setAiMode}
              topic={topic}
              setTopic={setTopic}
              file={file}
              setFile={setFile}
              onPickFile={onPickFile}
              fileRef={fileRef}
              instruction={instruction}
              setInstruction={setInstruction}
              numQuestions={numQuestions}
              setNumQuestions={setNumQuestions}
              numOptions={numOptions}
              setNumOptions={setNumOptions}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
              aiLoading={aiLoading}
              aiError={aiError}
              generateWithAI={generateWithAI}
              clampedNumQ={clampedNumQ}
              clampedNumOpt={clampedNumOpt}
            />
          ) : (

            <CustomQuizSection
              form={form}
              setForm={setForm}
              questions={questions}
              addQuestion={addQuestion}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
              updateOption={updateOption}
              createQuiz={createQuiz}
              busyCreate={busyCreate}
              profile={profile}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
            />

          )}
        </div>

        {/* Right Column - My Quizzes */}
        <Section title="My Quizzes">
          <QuizListSection
            search={search}
            setSearch={setSearch}
            filterDept={filterDept}
            setFilterDept={setFilterDept}
            filterYear={filterYear}
            setFilterYear={setFilterYear}
            busyList={busyList}
            filtered={filtered}
            onDelete={deleteQuiz}
            onDuplicate={duplicateQuiz}
            onEdit={editQuiz}
          />
        </Section>
      </div>

      {/* AI Quiz Preview & Editor */}
      {aiQuiz?.questions?.length ? (
        <AiQuizPreviewSection
          aiQuiz={aiQuiz}
          setAiQuiz={setAiQuiz}
          updateAiQuestion={updateAiQuestion}
          removeAiQuestion={removeAiQuestion}
          updateAiOption={updateAiOption}
          publishAiQuiz={publishAiQuiz}
          updateExistingQuiz={updateExistingQuiz}
          publishing={publishing}
        />
      ) : null}

      {/* Toast */}
      {toast.msg && (
        <div
          className={`fixed top-6 right-4 z-50 flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold shadow-2xl backdrop-blur-xl border ${toast.type === "error"
            ? "bg-red-950/80 border-red-800/50 text-red-200 shadow-red-900/30"
            : "bg-green-950/80 border-green-800/50 text-green-200 shadow-green-900/30"
            } animate-[fadeIn_300ms_ease]`}
        >
          <span className={`w-2 h-2 rounded-full ${toast.type === "error" ? "bg-red-400" : "bg-green-400"}`} />
          {toast.msg}
        </div>
      )}

      {/* Profile Drawer */}
      <TeacherProfileDrawer
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        initial={teacherMeta}
      />
    </Screen>
  );
}
/* ------------------------------ TEACHER PROFILE ------------------------------ */
function TeacherProfileDrawer({ open, onClose, initial }) {
  const { fbUser } = useAuth();
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    dob: initial?.dob || "",
    gender: initial?.gender || "",
    institute: initial?.institute || "",
    department: initial?.department || "",
    photoURL: initial?.photoURL || auth.currentUser?.photoURL || "",
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: initial?.name || "",
      dob: initial?.dob || "",
      gender: initial?.gender || "",
      institute: initial?.institute || "",
      department: initial?.department || "",
      photoURL: initial?.photoURL || auth.currentUser?.photoURL || "",
    });
  }, [open, initial]);

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
      setForm((f) => ({ ...f, photoURL: dataUrl }));
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
    setForm((f) => ({ ...f, photoURL: googleUrl }));
  };

  const save = async () => {
    if (!fbUser) return;
    setSaving(true);
    try {
      // 1) Update Firestore profile (This always works)
      await setDoc(
        doc(db, "users", fbUser.uid),
        {
          role: "teacher",
          name: (form.name || "").trim() || null,
          dob: form.dob || null,
          gender: form.gender || null,
          institute: form.institute || null,
          department: form.department || null,
          photoURL: form.photoURL || null, // Saves data: OR https:
          email: auth.currentUser?.email || null,
        },
        { merge: true }
      );

      // 2) Update Firebase Auth profile
      if (auth.currentUser) {

        // --- THIS IS THE FIX ---
        // We must only send an http(s) URL to Firebase Auth.
        // It REJECTS data: URLs, which causes the save to fail.

        const isDataUrl = form.photoURL?.startsWith("data:");

        const authPhotoPayload = isDataUrl
          ? auth.currentUser.photoURL // Keep the existing auth URL
          : form.photoURL || null;    // Update with http(s) URL or null

        await updateProfile(auth.currentUser, {
          displayName: (form.name || "").trim() || auth.currentUser.displayName || "",
          photoURL: authPhotoPayload, // Use our safe payload
        });
        // --- END OF FIX ---
      }

      onClose();
    } catch (e) {
      console.error("Profile save error:", e);
      alert("Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc =
    form.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "Teacher")}&background=0D8ABC&color=fff`;

  return (
    <>
      {/* Scrim */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-full max-w-md transform bg-gray-950/95 backdrop-blur-xl border-l border-gray-800 transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-bold">Your Profile</h3>
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>

        {/* Scroll region */}
        <div className="h-[calc(100dvh-58px)] overflow-y-auto overscroll-contain">
          <div className="p-4">
            <div className="mx-auto max-w-lg md:scale-[0.96] md:origin-top transition space-y-5">
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
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-bold transition shadow-lg shadow-indigo-900/20"
                  >
                    {uploading ? "Uploading…" : "Upload Photo"}
                  </button>
                  <button
                    onClick={useGooglePhoto}
                    className="rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 text-sm font-semibold transition"
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

              {/* Fields (no department / academic year) */}
              <Field
                label="Full Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <Field
                type="date"
                label="Date of Birth"
                value={form.dob}
                onChange={(v) => setForm({ ...form, dob: v })}
              />
              <Select
                label="Gender"
                value={form.gender}
                onChange={(v) => setForm({ ...form, gender: v })}
                options={["Male", "Female", "Other", "Prefer not to say"]}
              />
              <Field
                label="Institute"
                value={form.institute}
                onChange={(v) => setForm({ ...form, institute: v })}
                placeholder="e.g., Ponjesly College of Engineering"
              />
              <Select
                label="Department"
                value={form.department}
                onChange={(v) => setForm({ ...form, department: v })}
                options={DEPARTMENTS.map((d) => ({ value: d.value, text: d.label }))}
              />


              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-bold text-gray-200 hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  onClick={save}
                  className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${saving
                    ? "bg-gray-700 text-gray-400"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                    }`}
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------- AI QUIZ SECTION -------------------------------- */

function AiQuizSection({
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts, aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt
}) {
  return (
    <Section title="AI Quiz Forge">
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 backdrop-blur-2xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_32px_-12px_rgba(79,70,229,0.25)] flex flex-col gap-6">
        <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-purple-600/10 blur-3xl" />

        {/* Mode Switch (Segmented Control) */}
        <div className="relative z-10 flex p-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl w-full">
          {["topic", "file"].map((m) => (
            <button
              key={m}
              onClick={() => setAiMode(m)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${aiMode === m
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
            >
              {m === "topic" ? "From Topic" : "From File"}
            </button>
          ))}
        </div>

        {/* Inputs */}
        <form onSubmit={generateWithAI} className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {aiMode === "topic" ? (
              <div>
                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Topic</label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Data Structures (Stacks, Queues)"
                  className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Upload .txt or .csv</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-gray-700/80 bg-gray-800/40 px-5 py-8 text-center hover:border-indigo-500 hover:bg-gray-800/60 transition-all group"
                >
                  <div className="text-sm font-semibold text-gray-300 group-hover:text-indigo-300">{file ? file.name : "Click to choose a file"}</div>
                  <div className="mt-1 text-xs text-gray-500">Max few hundred KB recommended</div>
                </div>
                <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv" onChange={onPickFile} />
                <div>
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Instruction</label>
                  <textarea
                    rows={3}
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    placeholder="E.g., Create 8 MCQs focusing on key definitions and examples."
                    className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
                  />
                </div>
              </div>
            )}

            {/* Settings Layout Refactor */}
            <div className="flex flex-col gap-6">
              {/* Row 1: Core Params */}
              <div className="grid grid-cols-2 gap-5">
                <NumberField
                  label="Questions (1–100)"
                  value={numQuestions}
                  onChange={(v) => setNumQuestions(v)}
                  onBlur={() => setNumQuestions(clampedNumQ(numQuestions))}
                  min={1} max={100}
                />
                <NumberField
                  label="Options (2–10)"
                  value={numOptions}
                  onChange={(v) => setNumOptions(v)}
                  onBlur={() => setNumOptions(clampedNumOpt(numOptions))}
                  min={2} max={10}
                />
              </div>

              {/* Row 2: Logic - Full Width */}
              <Select
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={["Easy", "Moderate", "Hard"]}
              />

              {/* Row 3: Limit - Full Width */}
              <NumberField
                label="Limit Attempts (0 - 5)"
                value={maxAttempts}
                onChange={(v) => setMaxAttempts(v)}
                onBlur={(v) => setMaxAttempts(Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Number(maxAttempts || 0))))} min={MIN_ATTEMPTS} max={MAX_ATTEMPTS}
              />
            </div>

            <div className="mt-2">
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Timer</label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl p-1.5 w-full">
                {["off", "perQuestion", "total"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimerMode(t)}
                    className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${timerMode === t
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      }`}
                  >
                    {t === "perQuestion" ? "Per Question" : t === "total" ? "Total Quiz" : "Off"}
                  </button>
                ))}
              </div>

              {timerMode === "perQuestion" && (
                <div className="mt-4">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Seconds per Question (≥ 10)</label>
                  <input
                    type="number"
                    min={10}
                    value={timeValue}
                    onChange={(e) => setTimeValue(Math.max(10, Number(e.target.value)))}
                    className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
                  />
                </div>
              )}
              {timerMode === "total" && (
                <div className="mt-4">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Total Minutes (≥ 1)</label>
                  <input
                    type="number"
                    min={1}
                    value={timeValue}
                    onChange={(e) => setTimeValue(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1 h-full">
            <div className="h-full rounded-3xl border border-gray-800/60 bg-gradient-to-br from-gray-900/80 to-indigo-950/20 p-6 flex flex-col justify-center items-center text-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-2xl rounded-full pointer-events-none" />

              <div className="text-sm font-medium text-gray-400">AI will create:</div>
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">
                {numQuestions}
              </div>
              <div className="text-sm font-semibold text-gray-300">
                questions <span className="text-gray-500 font-normal">with {numOptions} options each</span>
              </div>

              <div className="mt-2 w-full h-px bg-gray-800/60" />

              <div className="w-full flex justify-between items-center text-sm px-2">
                <span className="text-gray-500">Difficulty:</span>
                <span className="font-bold text-gray-200">{difficulty}</span>
              </div>
              <div className="w-full flex justify-between items-center text-sm px-2">
                <span className="text-gray-500">Timer:</span>
                <span className="font-bold text-gray-200">
                  {timerMode === "off" ? "Off" : timerMode === "perQuestion" ? `${timeValue}s / Q` : `${timeValue}m Total`}
                </span>
              </div>

              {aiError && (
                <div className="mt-2 w-full rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300 text-left">
                  {aiError}
                </div>
              )}
              <button
                type="submit"
                disabled={aiLoading}
                className="mt-2 w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-white px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 disabled:shadow-none"
              >
                {aiLoading ? "Generating…" : "Generate with AI"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Section>
  );
}

/* -------------------------------- CUSTOM QUIZ SECTION -------------------------------- */

function CustomQuizSection({
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, createQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts
}) {
  return (
    <Section title="Create Custom Quiz">
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 backdrop-blur-2xl p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_32px_-12px_rgba(79,70,229,0.25)] flex flex-col gap-6">
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl" />

        {/* Top badges */}
        <div className="relative z-10 flex flex-wrap items-center gap-2">
          <Badge>{profile?.institute || "Your Institute"}</Badge>
          <Badge>Teacher</Badge>
        </div>

        {/* Form */}
        <div className="relative z-10 grid gap-6">
          <Field
            label="Title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="e.g., Basics of C Programming"
          />
          <Field
            label="Short Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder="A short one-liner about this quiz"
          />

          {/* Department + Year */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Department"
              value={form.department}
              onChange={(v) => setForm({ ...form, department: v })}
              options={DEPARTMENTS.map((d) => ({ value: d.value, text: d.label }))}
            />
            <Select
              label="Academic Year"
              value={form.academicYear}
              onChange={(v) => setForm({ ...form, academicYear: v })}
              options={ACADEMIC_YEARS.map((y) => ({ value: y, text: y }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

            <Select
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={["Easy", "Moderate", "Hard"]}
            />
            <NumberField
              label="Limit Attempts (0 - 5)"
              value={maxAttempts}
              onChange={(v) => setMaxAttempts(v)}
              onBlur={(v) => setMaxAttempts(Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Number(maxAttempts || 0))))} min={MIN_ATTEMPTS} max={MAX_ATTEMPTS}
            />

            <div>
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Timer</label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl p-1.5 w-full">
                {["off", "perQuestion", "total"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimerMode(t)}
                    className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${timerMode === t
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                      }`}
                  >
                    {t === "perQuestion" ? "Per Q" : t === "total" ? "Total" : "Off"}
                  </button>
                ))}
              </div>
            </div>

            {(timerMode === "perQuestion" || timerMode === "total") && (
              <div className="sm:col-span-2">
                <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">
                  {timerMode === "perQuestion" ? "Seconds per Question (≥ 10)" : "Total Minutes (≥ 1)"}
                </label>
                <input
                  type="number"
                  min={timerMode === "perQuestion" ? 10 : 1}
                  value={timeValue}
                  onChange={(e) => setTimeValue(Math.max(timerMode === "perQuestion" ? 10 : 1, Number(e.target.value)))}
                  className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
                />
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="mt-2 space-y-5">
            <div className="text-sm text-gray-400">Questions</div>

            {questions.map((q, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 relative"
              >
                {/* remove */}
                <button
                  onClick={() => removeQuestion(i)}
                  className="absolute -top-3 -right-3 rounded-full bg-red-600 hover:bg-red-700 text-white w-8 h-8 text-sm shadow-lg"
                  title="Remove question"
                  disabled={questions.length === 1}
                >
                  ×
                </button>

                <Field
                  label={`Q${i + 1}. Question`}
                  value={q.question}
                  onChange={(v) => updateQuestion(i, { question: v })}
                  placeholder="Type the question"
                />

                {/* Options */}
                <div className="mt-3 grid sm:grid-cols-2 gap-3">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="relative">
                      <label className="mb-2 block text-xs font-medium text-gray-300 tracking-wide">
                        Option {String.fromCharCode(65 + oi)}
                      </label>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(i, oi, e.target.value)}
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateQuestion(i, { answerIndex: oi })}
                        className={`absolute right-2 top-8 rounded-md px-2 py-1 text-xs font-semibold border ${q.answerIndex === oi
                          ? "bg-emerald-600/80 border-emerald-500 text-white"
                          : "bg-gray-800/70 border-gray-700 text-gray-300 hover:bg-gray-700"
                          }`}
                        title="Mark as correct"
                      >
                        {q.answerIndex === oi ? "Correct" : "Set Correct"}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                <div className="mt-4">
                  <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Explanation (shown after answer)</label>
                  <textarea
                    rows={2}
                    value={q.explanation}
                    onChange={(e) => updateQuestion(i, { explanation: e.target.value })}
                    placeholder="Why this answer is correct…"
                    className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100 max-h-40 min-h-[80px]"
                  />
                </div>
              </div>
            ))}

            {/* Add Question */}
            <div className="flex justify-between items-center">
              <button
                onClick={addQuestion}
                className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-sm border border-gray-700"
              >
                + Add another question
              </button>

              <button
                onClick={createQuiz}
                disabled={busyCreate}
                className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] ${busyCreate
                  ? "bg-gray-700 text-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                  }`}
              >
                {busyCreate ? "Creating…" : "Create Quiz"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* -------------------------------- QUIZ LIST SECTION -------------------------------- */

function QuizListSection({
  search, setSearch, filterDept, setFilterDept, filterYear, setFilterYear,
  busyList, filtered, onDelete, onDuplicate, onEdit
}) {
  return (
    <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 backdrop-blur-xl p-5">
      {/* Filters */}
      <div className="flex flex-col gap-3">
        <InputSmall
          placeholder="Search quizzes..."
          value={search}
          onChange={setSearch}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SelectSmall
            value={filterDept}
            onChange={setFilterDept}
            placeholder="All Departments"
            options={[{ value: "", text: "All Departments" }].concat(
              DEPARTMENTS.map((d) => ({ value: d.value, text: d.label }))
            )}
          />
          <SelectSmall
            value={filterYear}
            onChange={setFilterYear}
            placeholder="All Years"
            options={[{ value: "", text: "All Years" }].concat(
              ACADEMIC_YEARS.map((y) => ({ value: y, text: y }))
            )}
          />
          <button
            onClick={() => {
              setFilterDept("");
              setFilterYear("");
              setSearch("");
            }}
            className="h-[44px] rounded-xl px-5 bg-gray-800 hover:bg-gray-700 text-sm font-semibold border border-gray-700 transition-colors text-gray-300"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Quiz count */}
      {!busyList && filtered.length > 0 && (
        <div className="mt-3 text-xs font-bold uppercase tracking-wider text-gray-500">
          {filtered.length} Quiz{filtered.length !== 1 ? "zes" : ""}
        </div>
      )}

      {/* List */}
      <div className="mt-4 grid gap-4">
        {busyList ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <Empty text="You haven't created any quizzes yet. Use the AI Quiz Generator or Custom Quiz Creator to get started!" />
        ) : (
          filtered.map((qz) => (
            <QuizRow
              key={qz.id}
              quiz={qz}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* -------------------------------- AI QUIZ PREVIEW SECTION -------------------------------- */

function AiQuizPreviewSection({
  aiQuiz, setAiQuiz, updateAiQuestion, removeAiQuestion, updateAiOption,
  publishAiQuiz, updateExistingQuiz, publishing
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xl font-semibold text-white/90">
        Preview & Edit ({aiQuiz.questions.length} items)
      </h2>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
        <div className="px-4 py-3 text-xs text-gray-400 border-b border-gray-800 flex items-center justify-between">
          <div>
            Topic: <span className="text-gray-200">{aiQuiz.meta.topic}</span> •
            Difficulty: <span className="text-gray-200">{aiQuiz.meta.difficulty}</span>
          </div>
          <div className="text-[11px]">
            Timer: {aiQuiz.meta.timer.mode === "off" ? "Off" :
              aiQuiz.meta.timer.mode === "perQuestion" ? `${aiQuiz.meta.timer.time}s / Q` : `${aiQuiz.meta.timer.time}m total`}
          </div>
        </div>

        <div className="divide-y divide-gray-800">
          {aiQuiz.questions.map((q, i) => (
            <div key={i} className="p-4 md:p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="font-semibold text-sm text-gray-300">Q{i + 1}</div>
                <button
                  onClick={() => removeAiQuestion(i)}
                  className="rounded-md border border-red-800/60 bg-red-900/30 px-2 py-1 text-xs text-red-200 hover:bg-red-900/50"
                  title="Remove question"
                >
                  Remove
                </button>
              </div>

              <textarea
                value={q.question}
                onChange={(e) => updateAiQuestion(i, { question: e.target.value })}
                rows={2}
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      value={opt}
                      onChange={(e) => updateAiOption(i, oi, e.target.value)}
                      className="flex-1 rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => updateAiQuestion(i, { answerIndex: oi })}
                      className={`rounded-md px-2 py-1 text-xs border ${q.answerIndex === oi
                        ? "bg-green-700/40 border-green-500 text-green-200"
                        : "bg-gray-800/60 border-gray-700 text-gray-300 hover:bg-gray-700"
                        }`}
                      title="Mark as correct"
                    >
                      {q.answerIndex === oi ? "Correct" : "Mark"}
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-3">
                <textarea
                  value={q.explanation}
                  onChange={(e) => updateAiQuestion(i, { explanation: e.target.value })}
                  rows={2}
                  placeholder="Explanation (optional)"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800/80 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-gray-800">
          <button
            onClick={() => setAiQuiz(null)}
            className="rounded-xl border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-bold text-gray-200 hover:bg-gray-700 transition"
          >
            Discard
          </button>
          <button
            onClick={aiQuiz.meta.editingId ? updateExistingQuiz : publishAiQuiz}
            disabled={publishing}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-white px-5 py-2.5 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-700 disabled:text-gray-400 disabled:scale-100 disabled:shadow-none"
          >
            {publishing ? "Saving…" : (aiQuiz.meta.editingId ? "Update Quiz" : "Publish Quiz")}
          </button>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- UI COMPONENTS -------------------------------- */

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white p-4 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        {children}
      </div>
    </div>
  );
}

function Header({ profile, fbUser, onOpenProfile }) {
  const nav = useNavigate();

  const doLogout = async () => {
    try {
      await signOut(auth);
      nav("/signin", { replace: true });
    } catch (e) {
      console.error("Sign out error:", e);
      alert("Could not log out. Please try again.");
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold shadow-lg shadow-indigo-500/30">Q</div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Teacher Dashboard</h1>
          <div className="flex items-center gap-3">
            <p className="text-indigo-300 font-medium text-sm">
              Welcome back, {profile?.name || fbUser?.displayName || fbUser?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Avatar -> opens drawer + Logout */}
      <div className="flex items-center gap-3">
        <button
          onClick={doLogout}
          className="hidden sm:inline-flex rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-900/40"
          title="Log out"
        >
          Sign Out
        </button>

        <button
          onClick={onOpenProfile}
          className="group relative rounded-full p-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:scale-105 transition-transform"
          title="Profile & Settings"
        >
          <img
            src={
              profile?.photoURL ||
              fbUser?.photoURL || // <-- Use fbUser prop
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                profile?.name || fbUser?.displayName || "T" // <-- Use fbUser prop
              )}&background=0D8ABC&color=fff`
            }
            alt="avatar"
            className="relative h-10 w-10 rounded-full object-cover border-2 border-gray-900"
          />
          <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition">
            Edit
          </span>
        </button>
      </div>
    </div>
  );
}


function Section({ title, children }) {
  return (
    <div>
      <h2 className="mb-4 text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">{title}</h2>
      {children}
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
    <span className="px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700/60 text-xs font-semibold text-gray-300">
      {children}
    </span>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div className="flex flex-col min-w-0">
      <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300 truncate">{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-[50px] rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100 ${type === "date" ? "[color-scheme:dark]" : ""}`}
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, onBlur }) {
  return (
    <div className="flex flex-col min-w-0">
      <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300 truncate">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-full h-[50px] rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 text-gray-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, renderOption }) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, text: renderOption ? renderOption(o) : o } : o
  );

  return (
    <div className="flex flex-col min-w-0">
      <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300 truncate">{label}</label>
      <div className="relative">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full h-[50px] rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 pr-12 text-[15px] text-gray-100 outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 cursor-pointer"
        >
          <option value="">{`Select ${label.toLowerCase()}`}</option>
          {normalized.map((o) => (
            <option key={o.value} value={o.value}>
              {o.text}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function InputSmall({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm">
        🔍
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[44px] rounded-xl border border-gray-700/80 bg-gray-800/60 pl-10 pr-4 text-sm text-gray-100 outline-none transition-all placeholder:text-gray-500 focus:border-indigo-500 focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-600 cursor-text"
      />
    </div>
  );
}

function SelectSmall({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-[44px] w-full min-w-[140px] rounded-xl border border-gray-700/80 bg-gray-800/60 px-4 pr-10 text-sm text-gray-100 outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-2 focus:ring-indigo-500/20 hover:border-gray-600 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M7 10l5 5 5-5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center">
      <div className="mx-auto mb-3 text-3xl opacity-30">📋</div>
      <div className="text-gray-400 text-sm font-medium">{text}</div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-3 w-16 bg-gray-800 rounded-full" />
        <div className="h-3 w-12 bg-gray-800 rounded-full" />
      </div>
      <div className="h-5 w-2/5 bg-gray-800 rounded" />
      <div className="mt-3 h-3 w-3/4 bg-gray-800 rounded" />
    </div>
  );
}

function QuizRow({ quiz, onDelete, onDuplicate, onEdit }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });

  const loadStats = async () => {
    setStats((s) => ({ ...s, loading: true }));
    try {
      const qRef = query(
        collection(db, "quizAttempts"),
        where("quizId", "==", quiz.id),
        orderBy("completedAt", "desc")
      );
      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => d.data());

      if (!rows.length) {
        setStats({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });
        return;
      }

      // Group by studentId and take BEST score per student for clearer analytics
      const userBestMap = {};
      rows.forEach(r => {
        const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
        if (!userBestMap[r.studentId] || pct > userBestMap[r.studentId]) {
          userBestMap[r.studentId] = pct;
        }
      });

      const uniqueStudentPcts = Object.values(userBestMap);
      const count = uniqueStudentPcts.length;
      const avg = count ? Math.round(uniqueStudentPcts.reduce((s, x) => s + x, 0) / count) : 0;
      const best = uniqueStudentPcts.length ? Math.max(...uniqueStudentPcts) : 0;
      const last = rows[0]?.completedAt || null;
      setStats({ loading: false, count, avg, best, last, error: null });
    } catch (e) {
      console.error("Stats error:", e);
      let errorMsg = "Could not load data: " + (e.code || e.message || "Unknown error");
      if (e.code === "permission-denied") {
        errorMsg = "Unauthorized. Check your Firestore rules.";
      } else if (e.code?.toString().includes("index") || e.message?.toLowerCase().includes("index")) {
        errorMsg = "Index required. See console for setup link.";
      }
      setStats({ loading: false, count, avg, best, last, error: errorMsg });
    }
  };

  const handleToggle = () => {
    setOpen((o) => !o);
    if (!open) loadStats();
  };

  return (
    <div className="group rounded-2xl border border-gray-800/80 bg-gray-900/60 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_30px_-10px_rgba(79,70,229,0.25)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 relative z-10">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="rounded-md border border-gray-700/80 bg-gray-800/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
              {quiz.department} • {quiz.academicYear}
            </span>
            {quiz.sourceMode && (
              <span className="flex items-center gap-1 rounded-md border border-indigo-700/50 bg-indigo-900/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {quiz.sourceMode === "custom" ? "Custom" : "AI Generated"}
              </span>
            )}
            {quiz.difficulty && (
              <span className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${quiz.difficulty === "Easy" ? "border-green-500/30 bg-green-500/10 text-green-400" :
                quiz.difficulty === "Hard" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                  "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                }`}>
                {quiz.difficulty}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-100 group-hover:text-indigo-300 transition-colors leading-tight mb-1">
            {quiz.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 md:line-clamp-1 mb-2 pr-4">{quiz.description || "—"}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium tracking-wide">
            <span>Created {fmtDate(quiz.createdAt)}</span>
            <span>•</span>
            <span>{quiz.questions?.length || 0} Questions</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-950/50 p-1 rounded-xl border border-gray-800/80">
              <button
                onClick={() => onEdit(quiz)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                title="Edit Quiz"
              >
                Edit
              </button>
              <button
                onClick={() => onDuplicate(quiz)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                title="Duplicate"
              >
                Duplicate
              </button>
              <button
                onClick={() => onDelete(quiz.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 ${open
              ? "bg-gray-800 border border-gray-700 text-white shadow-none"
              : "bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white shadow-indigo-900/30"
              }`}
            title="Toggle analytics"
          >
            {open ? "Hide Stats" : "View Analytics"}
          </button>
        </div>
      </div>

      {/* Body (analytics) */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-800/80 bg-gray-900/40 p-5 grid sm:grid-cols-4 gap-4 relative z-10">
            {stats.loading ? (
              <>
                <SkeletonChip />
                <SkeletonChip />
                <SkeletonChip />
                <SkeletonChip />
              </>
            ) : stats.error ? (
              <div className="sm:col-span-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-center">
                <div className="text-red-400 font-bold mb-1">Analytics Error</div>
                <div className="text-red-300/70 text-sm">{stats.error}</div>
              </div>
            ) : (
              <>
                <KPI label="Attempts" value={String(stats.count)} />
                <KPI label="Average" value={`${stats.avg}%`} />
                <KPI label="Best" value={`${stats.best}%`} />
                <KPI label="Last Attempt" value={fmtDate(stats.last) || "—"} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
function KPI({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-800/80 bg-gradient-to-br from-gray-900/80 to-indigo-950/20 p-5 flex flex-col items-center justify-center text-center inset-shadow-sm">
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</div>
      <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">{value}</div>
    </div>
  );
}

function SkeletonChip() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-4 animate-pulse">
      <div className="h-3 w-16 bg-gray-800 rounded" />
      <div className="mt-2 h-6 w-12 bg-gray-800 rounded" />
    </div>
  );
}

/* --------------------------------- HELPERS -------------------------------- */

function fmtDate(ts) {
  if (!ts) return "";
  try {
    if (typeof ts === "object" && typeof ts.toDate === "function") return ts.toDate().toLocaleString();
    if (typeof ts === "object" && typeof ts.toMillis === "function") return new Date(ts.toMillis()).toLocaleString();
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch (e) {
    return "";
  }
}

/* --- helper: compress to Data URL (no server, no Storage) --- */
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

function StudentRequestsSection({ requests, busyReqs }) {
  const handleApprove = async (req) => {
    const action = confirm(`Are you sure you want to APPROVE these changes for ${req.userName || req.userEmail}?\nThis will automatically update their profile.`);
    if (!action) return;

    try {
      // 1. Update the student's profile doc
      await updateDoc(doc(db, "users", req.userId), {
        ...req.requestedChanges,
        // Optional: lock all fields again by clearing any previous 'unlocked' flags if you use them
      });

      // 2. Mark request as resolved
      await updateDoc(doc(db, "editRequests", req.id), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        action: "approved"
      });
      alert("Changes applied and request resolved.");
    } catch (e) {
      console.error("Approve error:", e);
      if (e.code === "permission-denied") {
        alert("Permission denied. Ensure your Firestore Rules allow 'teacher' to update 'users' documents.");
      } else {
        alert("Could not approve request. See console for details.");
      }
    }
  };

  const handleReject = async (reqId) => {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // cancelled prompt

    try {
      await updateDoc(doc(db, "editRequests", reqId), {
        status: "resolved",
        resolvedAt: serverTimestamp(),
        action: "rejected",
        rejectReason: reason
      });
      alert("Request rejected.");
    } catch (e) {
      console.error("Reject error:", e);
      alert("Could not reject request.");
    }
  };

  return (
    <Section title="Pending Student Requests">
      <div className="rounded-2xl border border-gray-800/80 bg-gray-900/60 backdrop-blur-xl p-6">
        <p className="text-sm text-gray-400 mb-5 font-medium">
          Students in your department who need changes to their locked profile fields.
        </p>

        {busyReqs ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-28 bg-gray-800/50 rounded-2xl" />
            <div className="h-28 bg-gray-800/50 rounded-2xl" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-3xl opacity-30 mb-3">✅</div>
            <div className="text-gray-500 text-sm font-medium">No pending requests for your department.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {requests.map(req => (
              <div key={req.id} className="group rounded-2xl border border-indigo-800/30 bg-gradient-to-br from-indigo-950/30 to-gray-900/50 p-5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-[0_4px_24px_-8px_rgba(99,102,241,0.2)]">
                <div className="flex justify-between items-start gap-3 mb-4">
                  <div>
                    <div className="font-bold text-indigo-100 text-base">{req.userName || "Student"}</div>
                    <div className="text-sm text-indigo-400 font-medium">{req.userEmail}</div>
                    <div className="text-[10px] font-medium text-gray-500 mt-1">
                      {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleString() : "Recently"}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => handleReject(req.id)}
                      className="rounded-xl border border-red-900/50 bg-red-950/20 hover:bg-red-900/40 text-red-400 text-xs font-bold px-4 py-2 transition-all"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 transition-all shadow-lg shadow-indigo-900/20 hover:scale-105 active:scale-95"
                    >
                      Approve & Apply
                    </button>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Requested Changes:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {req.fields?.map((field, i) => (
                      <div key={i} className="rounded-xl bg-gray-950/40 border border-gray-800/80 p-3">
                        <div className="text-[10px] font-black uppercase text-indigo-400 mb-2">{field.replace(/([A-Z])/g, ' $1')}</div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex-1 opacity-50 line-through truncate">{req.oldValues?.[field] || "EMPTY"}</div>
                          <div className="text-gray-600">→</div>
                          <div className="flex-1 text-green-400 font-bold truncate">{req.requestedChanges?.[field]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-950/50 p-3.5 border border-gray-800/50">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Reason provided:</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{req.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}