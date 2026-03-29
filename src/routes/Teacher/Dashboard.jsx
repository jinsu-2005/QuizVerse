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

// Sub-modules
import { SidebarLayout } from "./DashboardComponents/Sidebar.jsx";
import { HomeSection } from "./DashboardComponents/Home.jsx";
import { AnalyticsSection } from "./DashboardComponents/Analytics.jsx";
import { StudentRequestsSection } from "./DashboardComponents/Requests.jsx";
import { CreateQuizSection } from "./DashboardComponents/CreateQuiz.jsx";
import { QuizListSection } from "./DashboardComponents/QuizList.jsx";
import { TeacherProfileDrawer } from "./DashboardComponents/Profile.jsx";
import { StudentManagementSection } from "./DashboardComponents/Students.jsx";
import { StaffManagementSection } from "./DashboardComponents/Staff.jsx";
import { PlaceholderView, SelectSmall } from "./DashboardComponents/UI.jsx";
import { MIN_Q, MAX_Q, MIN_OPT, MAX_OPT } from "./DashboardComponents/Utils.js";

export default function TeacherDashboard() {
  const { fbUser, profile: initialProfile, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(initialProfile);

  useEffect(() => { setProfile(initialProfile); }, [initialProfile]);

  useEffect(() => {
    if (!fbUser?.uid) return;
    const userDocRef = doc(db, "users", fbUser.uid);
    const unsub = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) setProfile(doc.data());
    }, (err) => console.error("Profile snapshot error:", err));
    return () => unsub();
  }, [fbUser?.uid]);

  const [activeTab, setActiveTab] = useState("home");
  const [generateMode, setGenerateMode] = useState("ai");
  const [editingId, setEditingId] = useState(null);
  const [maxAttempts, setMaxAttempts] = useState(0);
  const [difficulty, setDifficulty] = useState("Moderate");
  const [timerMode, setTimerMode] = useState("off");
  const [timeValue, setTimeValue] = useState(30);
  const [aiMode, setAiMode] = useState("topic");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("Create a multiple-choice quiz based on the provided text.");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOptions, setNumOptions] = useState(4);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const fileRef = useRef(null);

  const [form, setForm] = useState({ title: "", description: "", department: "", academicYear: "" });
  const [questions, setQuestions] = useState([{ question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }]);
  const [busyCreate, setBusyCreate] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [quizzes, setQuizzes] = useState([]);
  const [busyList, setBusyList] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [requests, setRequests] = useState([]);
  const [busyReqs, setBusyReqs] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });

  useEffect(() => {
    if (!toast.msg) return;
    const t = setTimeout(() => setToast({ type: "", msg: "" }), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Route guard
  useEffect(() => {
    if (loading) return;
    if (!fbUser) return nav("/signin", { replace: true });
    if (!profile || !profile.role) return nav("/role", { replace: true });
    
    const validRoles = ["teacher", "super_admin", "inst_admin", "dept_admin"];
    if (!validRoles.includes(profile.role)) return nav("/student", { replace: true });
  }, [fbUser, profile, loading, nav]);

  // Autosave Draft logic
  useEffect(() => {
    if (editingId || !fbUser || activeTab !== "create") return;
    const isBlank = !form.title.trim() && questions.length === 1 && !questions[0].question.trim();
    if (isBlank) {
        localStorage.removeItem("quizVerseDraft");
        setSaveStatus("");
        return;
    }

    setSaveStatus("Syncing...");
    const timeout = setTimeout(() => {
        localStorage.setItem("quizVerseDraft", JSON.stringify({ form, questions, difficulty, timerMode, timeValue, maxAttempts }));
        setSaveStatus("Saved to Drafts");
        setTimeout(() => setSaveStatus(""), 1500);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [form, questions, difficulty, timerMode, timeValue, maxAttempts, activeTab, editingId, fbUser]);

  useEffect(() => {
    const saved = localStorage.getItem("quizVerseDraft");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.form.title || p.questions[0].question) {
            setForm(p.form); setQuestions(p.questions); setDifficulty(p.difficulty); setTimerMode(p.timerMode);
            setTimeValue(p.timeValue); setMaxAttempts(p.maxAttempts); setGenerateMode("manual");
        }
      } catch(e) {}
    }
  }, []);

  // Sync quizzes
  useEffect(() => {
    if (!fbUser || !profile) return;
    setBusyList(true);
    let q;
    const quizzesRef = collection(db, "quizzes");
    
    if (profile.role === "super_admin") {
      q = query(quizzesRef, orderBy("createdAt", "desc"));
    } else if (profile.role === "inst_admin" && profile.institute) {
      q = query(quizzesRef, where("institute", "==", profile.institute), orderBy("createdAt", "desc"));
    } else if (profile.role === "dept_admin" && profile.department) {
      q = query(quizzesRef, where("department", "==", profile.department), orderBy("createdAt", "desc"));
    } else {
      // default teacher: only their own
      q = query(quizzesRef, where("createdBy", "==", fbUser.uid), orderBy("createdAt", "desc"));
    }

    const unsub = onSnapshot(q, (ss) => {
      setQuizzes(ss.docs.map(d => ({ id: d.id, ...d.data() })));
      setBusyList(false);
    }, (err) => {
        console.error("Quiz sync error:", err);
        setBusyList(false);
    });
    return () => unsub();
  }, [fbUser, profile]);

  // Sync requests
  useEffect(() => {
    if (!profile) return;
    setBusyReqs(true);
    let qCol;
    const reqsRef = collection(db, "editRequests");

    if (profile.role === "super_admin") {
      qCol = query(reqsRef, where("status", "==", "pending"));
    } else if (profile.role === "inst_admin" && profile.institute) {
      qCol = query(reqsRef, where("institute", "==", profile.institute), where("status", "==", "pending"));
    } else if (profile.role === "dept_admin" && profile.department) {
      qCol = query(reqsRef, where("department", "==", profile.department), where("status", "==", "pending"));
    } else if (profile.role === "teacher" && profile.department) {
       // Teachers also see requests for their department? Or maybe only admins do?
       // Usually only DEPT_ADMIN processes them. But for now matching original logic if it were teacher-led.
       qCol = query(reqsRef, where("department", "==", profile.department), where("status", "==", "pending"));
    } else {
       setBusyReqs(false);
       return;
    }

    const unsub = onSnapshot(qCol, (ss) => {
      setRequests(ss.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.toMillis?.()||0) - (a.createdAt?.toMillis?.()||0)));
      setBusyReqs(false);
    }, (err) => {
        console.error("Request sync error:", err);
        setBusyReqs(false);
    });
    return () => unsub();
  }, [profile]);

  const filteredQuizzes = useMemo(() => {
    let rows = quizzes;
    if (filterDept) rows = rows.filter(r => r.department === filterDept);
    if (filterYear) rows = rows.filter(r => r.academicYear === filterYear);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      rows = rows.filter(r => r.title?.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s));
    }
    return rows;
  }, [quizzes, search, filterDept, filterYear]);

  const clampedNumQ = (v) => Math.max(MIN_Q, Math.min(MAX_Q, Number(v || 0)));
  const clampedNumOpt = (v) => Math.max(MIN_OPT, Math.min(MAX_OPT, Number(v || 0)));

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f && /(\.txt|\.csv)$/i.test(f.name)) setFile(f);
    else if (f) alert("Please upload .txt or .csv");
  };

  const generateWithAI = async (e) => {
    e?.preventDefault?.();
    setAiLoading(true); setAiError("");
    try {
      let opt = { method: "POST" };
      if (aiMode === "file") {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("config", JSON.stringify({ instruction, numQuestions: clampedNumQ(numQuestions), numOptions: clampedNumOpt(numOptions), difficulty }));
        opt.body = fd;
      } else {
        opt.headers = { "Content-Type": "application/json" };
        opt.body = JSON.stringify({ topic: topic.trim(), numQuestions: clampedNumQ(numQuestions), numOptions: clampedNumOpt(numOptions), difficulty });
      }
      const res = await fetch("/.netlify/functions/generateQuiz", opt);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI failed.");
      const eq = data.map(q => ({ question: q.question, options: q.options, answerIndex: q.options.indexOf(q.answer), explanation: q.explanation || "" }));
      setQuestions(eq); setGenerateMode("manual");
      setForm(f => ({ ...f, title: aiMode === "file" ? file.name : topic.trim() }));
    } catch (err) { setAiError(err.message); }
    finally { setAiLoading(false); }
  };

  const saveQuiz = async (status = "published") => {
    if (!fbUser) return;
    if (status !== "draft") {
      if (!form.title.trim() || !form.department || !form.academicYear) return setToast({ type: "error", msg: "Fill required fields." });
    }
    setBusyCreate(true);
    try {
      const payload = {
        title: (form.title || "").trim(), description: (form.description || "").trim(), department: form.department, academicYear: form.academicYear,
        difficulty, timer: { mode: timerMode, time: timeValue }, maxAttempts: Number(maxAttempts),
        questions: questions.map(q => ({ question: (q.question||"").trim(), options: (q.options||[]).map(o=>(o||"").trim()), answer: q.options[q.answerIndex], explanation: (q.explanation||"").trim() })),
        status, updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(db, "quizzes", editingId), payload);
        setToast({ type: "ok", msg: "Quiz record updated." });
      } else {
        payload.createdBy = fbUser.uid;
        payload.createdAt = serverTimestamp();
        const ref = await addDoc(collection(db, "quizzes"), payload);
        await setDoc(doc(db, "users", fbUser.uid, "teacherQuizzes", ref.id), { quizId: ref.id, title: payload.title, department: payload.department, academicYear: payload.academicYear, createdAt: serverTimestamp() });
        setToast({ type: "ok", msg: "Quiz published successfully." });
      }
      setForm({ title: "", description: "", department: "", academicYear: "" });
      setQuestions([{ question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }]);
      setEditingId(null); setGenerateMode("ai"); localStorage.removeItem("quizVerseDraft");
    } catch (e) { setToast({ type: "error", msg: "Operation failed." }); }
    finally { setBusyCreate(false); }
  };

  const editQuiz = (quiz) => {
    setForm({ title: quiz.title, description: quiz.description, department: quiz.department, academicYear: quiz.academicYear });
    setQuestions(quiz.questions.map(q => ({ question: q.question, options: q.options, answerIndex: q.options.indexOf(q.answer), explanation: q.explanation || "" })));
    setDifficulty(quiz.difficulty); setTimerMode(quiz.timer?.mode || "off"); setTimeValue(quiz.timer?.time || 30);
    setMaxAttempts(quiz.maxAttempts || 0); setEditingId(quiz.id); setGenerateMode("manual"); setActiveTab("create");
  };

  return (
    <SidebarLayout 
      profile={profile} fbUser={fbUser} onOpenProfile={() => setOpenProfile(true)}
      activeTab={activeTab} onTabSelect={setActiveTab} requestsCount={requests.length}
    >
      <div className="w-full flex-1 max-w-7xl mx-auto px-1 md:px-0">
        {activeTab === "home" && <HomeSection quizzes={quizzes} requestsCount={requests.length} profile={profile} fbUser={fbUser} />}
        {activeTab === "analytics" && <AnalyticsSection quizzes={quizzes} />}
        {activeTab === "students" && <StudentManagementSection profile={profile} />}
        {activeTab === "teachers" && <StaffManagementSection profile={profile} />}
        {activeTab === "institutes" && <PlaceholderView title="Collegiate Governance" />}
        {activeTab === "admins" && <PlaceholderView title="Global Authority" />}
        {activeTab === "departments" && <PlaceholderView title="Faculty Hierarchy" />}
        {activeTab === "quizzes" && (
           <QuizListSection 
             search={search} setSearch={setSearch} filterDept={filterDept} setFilterDept={setFilterDept} 
             filterYear={filterYear} setFilterYear={setFilterYear} busyList={busyList} filtered={filteredQuizzes}
             onDelete={async (id) => { if(confirm("Archive this module?")) await deleteDoc(doc(db, "quizzes", id)); }} 
             onDuplicate={async (q) => { const copy = { ...q, title: q.title + " (Copy)", createdAt: serverTimestamp() }; delete copy.id; await addDoc(collection(db, "quizzes"), copy); }} 
             onEdit={editQuiz}
           />
        )}
        {activeTab === "requests" && <StudentRequestsSection requests={requests} busyReqs={busyReqs} />}
        {activeTab === "create" && (
           <CreateQuizSection
             saveStatus={saveStatus} form={form} setForm={setForm} questions={questions} setQuestions={setQuestions}
             addQuestion={() => setQuestions([...questions, { question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }])}
             removeQuestion={(i) => setQuestions(questions.filter((_, idx) => idx !== i))}
             updateQuestion={(i, p) => setQuestions(qs => { const n=[...qs]; n[i]={...n[i], ...p}; return n; })}
             updateOption={(qi, oi, v) => setQuestions(qs => { const n=[...qs]; const o=[...n[qi].options]; o[oi]=v; n[qi].options=o; return n; })}
             saveQuiz={saveQuiz} busyCreate={busyCreate} profile={profile}
             difficulty={difficulty} setDifficulty={setDifficulty} timerMode={timerMode} setTimerMode={setTimerMode}
             timeValue={timeValue} setTimeValue={setTimeValue} maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
             aiMode={aiMode} setAiMode={setAiMode} topic={topic} setTopic={setTopic} file={file} setFile={setFile}
             onPickFile={onPickFile} fileRef={fileRef} instruction={instruction} setInstruction={setInstruction}
             numQuestions={numQuestions} setNumQuestions={setNumQuestions} numOptions={numOptions} setNumOptions={setNumOptions}
             aiLoading={aiLoading} aiError={aiError} generateWithAI={generateWithAI} clampedNumQ={clampedNumQ} clampedNumOpt={clampedNumOpt}
             generateMode={generateMode} setGenerateMode={setGenerateMode} editingId={editingId} cancelEdit={() => setEditingId(null)} fbUser={fbUser}
           />
        )}
      </div>

      {toast.msg && (
        <div className={`fixed top-12 right-6 z-[200] rounded-2xl px-6 py-4 text-sm font-bold shadow-xl border animate-in slide-in-from-right duration-500 scale-100 ${toast.type === "error" ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
           <div className="flex items-center gap-3">
              <span className="text-xl">{toast.type === "error" ? "⚠️" : "✔️"}</span>
              {toast.msg}
           </div>
        </div>
      )}

      <TeacherProfileDrawer open={openProfile} onClose={() => setOpenProfile(false)} initial={{ ...profile, uid: fbUser?.uid }} />
    </SidebarLayout>
  );
}