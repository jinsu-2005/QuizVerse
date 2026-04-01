import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  addDoc, collection, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp, where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ThemeToggle, UserAvatar, Section, StatCard } from "../../Teacher/DashboardComponents/UI.jsx";
import { ActivityLogsSection } from "../DashboardComponents/ActivityLogs.jsx";
import { QuizListSection } from "../../Teacher/DashboardComponents/QuizList.jsx";
import { StaffManagementSection } from "../../Teacher/DashboardComponents/Staff.jsx";
import { StudentManagementSection } from "../../Teacher/DashboardComponents/Students.jsx";
import { TeacherProfileDrawer } from "../../Teacher/DashboardComponents/Profile.jsx";

// Dept Admin sees: Dashboard, Teachers, Students, Quizzes, Logs
// Does NOT see: Users (global), Departments (global), Analytics, Settings
const NAV = [
  { id: "home",     label: "Dashboard",    icon: "🏠" },
  { id: "teachers", label: "Teachers",     icon: "👨‍🏫" },
  { id: "students", label: "Students",     icon: "🎓" },
  { id: "quizzes",  label: "Quizzes",      icon: "📝" },
  { id: "logs",     label: "Activity Logs", icon: "📜" },
];

function DeptAdminHome({ profile, quizzes }) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      {/* Role banner */}
      <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-6 py-5">
        <span className="text-3xl">🏢</span>
        <div>
          <div className="text-sm font-black text-emerald-500 uppercase tracking-widest">Department Admin Portal</div>
          <div className="text-[10px] text-[var(--text-dim)] font-semibold uppercase tracking-wider mt-0.5">
            Department: <span className="text-[var(--text-main)]">{profile?.department || "Not assigned"}</span>
            {" "} · {profile?.name}
          </div>
        </div>
      </div>

      <Section title={`Department Overview — ${profile?.department || ""}`} subtitle="Stats scoped to your assigned department only.">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <StatCard label="Dept Quizzes" value={quizzes.length} trend="MODULES" icon="📝" color="emerald" />
          <StatCard label="Published" value={quizzes.filter(q => q.status === "published").length} trend="LIVE" icon="✅" color="indigo" />
          <StatCard label="Drafts" value={quizzes.filter(q => q.status === "draft").length} trend="PENDING" icon="📋" color="amber" />
        </div>
      </Section>

      <Section title="Quick Access" subtitle="Your most-used department tools.">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: "👨‍🏫", label: "Manage Teachers", sub: "View and edit teachers in your department.", tab: "teachers", color: "amber" },
            { icon: "🎓", label: "Manage Students",  sub: "View and manage department students.",        tab: "students", color: "cyan"  },
            { icon: "📝", label: "View Quizzes",     sub: "Browse all quizzes in your department.",     tab: "quizzes",  color: "emerald" },
          ].map(card => (
            <div key={card.tab} className={`bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-6 flex flex-col gap-3 hover:border-${card.color}-400 transition-all cursor-pointer`}>
              <span className="text-3xl">{card.icon}</span>
              <div className="font-bold text-[var(--text-main)] text-sm uppercase tracking-widest">{card.label}</div>
              <div className="text-[10px] text-[var(--text-dim)] font-semibold">{card.sub}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function DeptAdminPortal() {
  const { fbUser, profile: initProfile, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(initProfile);
  const [activeTab, setActiveTab] = useState("home");
  const [openProfile, setOpenProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [busyList, setBusyList] = useState(true);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => { setProfile(initProfile); }, [initProfile]);

  useEffect(() => {
    if (!fbUser?.uid) return;
    return onSnapshot(doc(db, "users", fbUser.uid), d => {
      if (d.exists()) setProfile(d.data());
    });
  }, [fbUser?.uid]);

  // Strict route guard — only dept_admin allowed here
  useEffect(() => {
    if (loading) return;
    if (!fbUser) return nav("/signin", { replace: true });
    if (!profile?.role) return;
    if (profile.role === "super_admin") nav("/admin", { replace: true });
    else if (profile.role === "inst_admin") nav("/inst-admin", { replace: true });
    else if (!["dept_admin"].includes(profile.role)) nav("/teacher", { replace: true });
  }, [fbUser, profile, loading]);

  // Quizzes scoped strictly to this dept_admin's department
  useEffect(() => {
    if (!fbUser || !profile?.department) return;
    setBusyList(true);
    const q = query(
      collection(db, "quizzes"),
      where("department", "==", profile.department),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, ss => {
      setQuizzes(ss.docs.map(d => ({ id: d.id, ...d.data() })));
      setBusyList(false);
    }, () => setBusyList(false));
  }, [fbUser, profile?.department]);

  const filtered = useMemo(() => {
    let r = quizzes;
    if (filterYear) r = r.filter(q => q.academicYear === filterYear);
    if (search) r = r.filter(q => q.title?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [quizzes, search, filterYear]);

  const doLogout = async () => { await signOut(auth); nav("/signin", { replace: true }); };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans antialiased">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[var(--border-main)] bg-[var(--bg-card)] z-40 shadow-sm">
        <div className="p-8 border-b border-[var(--border-main)] flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab("home")}>
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-600 font-bold text-white shadow-lg group-hover:scale-110 transition-transform">Q</div>
          <div>
            <div className="text-xl font-black tracking-tight text-[var(--text-main)]">QuizVerse</div>
            <div className="text-[10px] font-bold tracking-wider text-emerald-500 uppercase">🏢 Dept Admin</div>
          </div>
        </div>

        {/* Department badge */}
        {profile?.department && (
          <div className="mx-4 mt-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Your Department</div>
            <div className="text-sm font-black text-[var(--text-main)] mt-0.5">{profile.department}</div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto p-4 space-y-1 mt-2">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${activeTab === item.id ? "bg-emerald-600 text-white shadow-xl shadow-emerald-500/20 font-bold" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"}`}>
              <span className={`text-xl transition-transform group-hover:scale-110 ${activeTab === item.id ? "" : "opacity-50 grayscale"}`}>{item.icon}</span>
              <span className="text-sm uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--border-main)] space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Theme</span>
            <ThemeToggle />
          </div>
          <div onClick={() => setOpenProfile(true)} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-main)] hover:border-emerald-400 cursor-pointer transition-all group">
            <UserAvatar src={profile?.photoURL} name={profile?.name} size="sm" verified />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-main)] truncate">{profile?.name || "Dept Admin"}</div>
              <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Dept Admin · {profile?.department}</div>
            </div>
            <span className="text-[var(--text-dim)] group-hover:translate-x-1 transition-transform">→</span>
          </div>
          <button onClick={doLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all group">
            <span className="text-lg group-hover:scale-110 transition-transform">🚪</span>
            <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="lg:hidden p-5 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3" onClick={() => setActiveTab("home")}>
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg shadow-md">Q</div>
            <div>
              <span className="font-bold text-[var(--text-main)] uppercase text-sm block">Dept Admin</span>
              <span className="text-[10px] text-emerald-500 font-bold">{profile?.department}</span>
            </div>
          </div>
          <button onClick={() => setShowMenu(true)} className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-dim)] border border-[var(--border-main)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-10">
          {activeTab === "home"     && <DeptAdminHome profile={profile} quizzes={quizzes} />}
          {activeTab === "teachers" && <StaffManagementSection profile={profile} />}
          {activeTab === "students" && <StudentManagementSection profile={profile} />}
          {activeTab === "quizzes"  && (
            <QuizListSection
              search={search} setSearch={setSearch}
              filterDept={profile?.department} setFilterDept={() => {}}  // locked to dept
              filterYear={filterYear} setFilterYear={setFilterYear}
              busyList={busyList} filtered={filtered}
              onDelete={async id => { if (confirm("Delete quiz?")) await deleteDoc(doc(db, "quizzes", id)); }}
              onDuplicate={async q => { const c = { ...q, title: q.title + " (Copy)", createdAt: serverTimestamp() }; delete c.id; await addDoc(collection(db, "quizzes"), c); }}
              onEdit={() => {}}
            />
          )}
          {activeTab === "logs"     && <ActivityLogsSection profile={profile} />}
        </div>

        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-card)] border border-[var(--border-main)] px-2 flex justify-around items-center h-[76px] w-[92%] max-w-sm rounded-[2.5rem] shadow-2xl">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-2xl transition-all ${activeTab === item.id ? "text-emerald-600 font-bold bg-emerald-50/50" : "text-[var(--text-dim)]"}`}>
              <span className={`text-xl ${activeTab === item.id ? "scale-110" : "opacity-50 grayscale"}`}>{item.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </main>

      {showMenu && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div className="relative w-[85%] max-w-sm bg-[var(--bg-card)] h-full border-l border-[var(--border-main)] shadow-2xl flex flex-col pt-10 px-8 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="text-xl font-bold uppercase tracking-tight block">🏢 Dept Admin</span>
                <span className="text-sm text-emerald-500 font-bold">{profile?.department}</span>
              </div>
              <button onClick={() => setShowMenu(false)} className="h-11 w-11 flex items-center justify-center bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl font-bold">✕</button>
            </div>
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Theme</span>
              <ThemeToggle />
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1">
              {NAV.map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMenu(false); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? "bg-emerald-600 text-white font-bold shadow-lg" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)]"}`}>
                  <span className={`text-xl ${activeTab === item.id ? "" : "opacity-50 grayscale"}`}>{item.icon}</span>
                  <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-6 border-t border-[var(--border-main)] pb-10">
              <button onClick={doLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
                <span>🚪</span><span className="text-sm font-bold uppercase tracking-wide">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <TeacherProfileDrawer open={openProfile} onClose={() => setOpenProfile(false)} initial={{ ...profile, uid: fbUser?.uid }} />
    </div>
  );
}
