import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { useAuth } from "../../../context/AuthContext.jsx";
import {
  addDoc, collection, deleteDoc, doc, getDocs,
  onSnapshot, orderBy, query, serverTimestamp,
  setDoc, updateDoc, where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { ThemeToggle, UserAvatar } from "../../Teacher/DashboardComponents/UI.jsx";
import { AdminHomeSection } from "../DashboardComponents/Home.jsx";
import { UserManagementSection } from "../DashboardComponents/UserManagement.jsx";
import { DepartmentManagementSection } from "../DashboardComponents/Departments.jsx";
import { ActivityLogsSection } from "../DashboardComponents/ActivityLogs.jsx";
import { AnalyticsSection } from "../DashboardComponents/Analytics.jsx";
import { SettingsSection } from "../DashboardComponents/Settings.jsx";
import { QuizListSection } from "../../Teacher/DashboardComponents/QuizList.jsx";
import { StaffManagementSection } from "../../Teacher/DashboardComponents/Staff.jsx";
import { StudentManagementSection } from "../../Teacher/DashboardComponents/Students.jsx";
import { TeacherProfileDrawer } from "../../Teacher/DashboardComponents/Profile.jsx";

const NAV = [
  { id: "home",        label: "Dashboard",     icon: "🏠" },
  { id: "users",       label: "Users",          icon: "👥" },
  { id: "departments", label: "Departments",    icon: "🏢" },
  { id: "teachers",    label: "Teachers",       icon: "👨‍🏫" },
  { id: "students",    label: "Students",       icon: "🎓" },
  { id: "quizzes",     label: "Quizzes",        icon: "📝" },
  { id: "analytics",   label: "Analytics",      icon: "📊" },
  { id: "logs",        label: "Activity Logs",  icon: "📜" },
  { id: "settings",    label: "Settings",       icon: "⚙️" },
];

export default function SuperAdminPortal() {
  const { fbUser, profile: initProfile, loading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(initProfile);
  const [activeTab, setActiveTab] = useState("home");
  const [openProfile, setOpenProfile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [quizzes, setQuizzes] = useState([]);
  const [busyList, setBusyList] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterYear, setFilterYear] = useState("");

  useEffect(() => { setProfile(initProfile); }, [initProfile]);

  useEffect(() => {
    if (!fbUser?.uid) return;
    return onSnapshot(doc(db, "users", fbUser.uid), d => {
      if (d.exists()) setProfile(d.data());
    });
  }, [fbUser?.uid]);

  useEffect(() => {
    if (loading) return;
    if (!fbUser) return nav("/signin", { replace: true });
    if (profile && profile.role !== "super_admin") {
      if (profile.role === "inst_admin") nav("/inst-admin", { replace: true });
      else if (profile.role === "dept_admin") nav("/dept-admin", { replace: true });
      else nav("/teacher", { replace: true });
    }
  }, [fbUser, profile, loading]);

  useEffect(() => {
    if (!fbUser) return;
    setBusyList(true);
    const q = query(collection(db, "quizzes"), orderBy("createdAt", "desc"));
    return onSnapshot(q, ss => {
      setQuizzes(ss.docs.map(d => ({ id: d.id, ...d.data() })));
      setBusyList(false);
    }, () => setBusyList(false));
  }, [fbUser]);

  const filtered = useMemo(() => {
    let r = quizzes;
    if (filterDept) r = r.filter(q => q.department === filterDept);
    if (filterYear) r = r.filter(q => q.academicYear === filterYear);
    if (search) r = r.filter(q => q.title?.toLowerCase().includes(search.toLowerCase()));
    return r;
  }, [quizzes, search, filterDept, filterYear]);

  const doLogout = async () => { await signOut(auth); nav("/signin", { replace: true }); };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans antialiased">

      {/* ── Sidebar ── */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[var(--border-main)] bg-[var(--bg-card)] z-40 shadow-sm">
        <div className="p-8 border-b border-[var(--border-main)] flex items-center gap-3 cursor-pointer group" onClick={() => setActiveTab("home")}>
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg group-hover:scale-110 transition-transform">Q</div>
          <div>
            <div className="text-xl font-black tracking-tight text-[var(--text-main)]">QuizVerse</div>
            <div className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase">👑 Super Admin</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all group ${activeTab === item.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 font-bold" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"}`}>
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
          <div onClick={() => setOpenProfile(true)} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-main)] hover:border-indigo-400 cursor-pointer transition-all group">
            <UserAvatar src={profile?.photoURL || fbUser?.photoURL} name={profile?.name} size="sm" verified />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-[var(--text-main)] truncate">{profile?.name || "Super Admin"}</div>
              <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Super Admin</div>
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
        {/* Mobile header */}
        <div className="lg:hidden p-5 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-3" onClick={() => setActiveTab("home")}>
            <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-md">Q</div>
            <span className="font-bold text-[var(--text-main)] uppercase tracking-tighter text-lg">QuizVerse</span>
          </div>
          <button onClick={() => setShowMenu(true)} className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-dim)] border border-[var(--border-main)]">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-10">
          {activeTab === "home"        && <AdminHomeSection profile={profile} />}
          {activeTab === "users"       && <UserManagementSection profile={profile} />}
          {activeTab === "departments" && <DepartmentManagementSection profile={profile} />}
          {activeTab === "teachers"    && <StaffManagementSection profile={profile} />}
          {activeTab === "students"    && <StudentManagementSection profile={profile} />}
          {activeTab === "quizzes"     && (
            <QuizListSection
              search={search} setSearch={setSearch}
              filterDept={filterDept} setFilterDept={setFilterDept}
              filterYear={filterYear} setFilterYear={setFilterYear}
              busyList={busyList} filtered={filtered}
              onDelete={async id => { if (confirm("Delete quiz?")) await deleteDoc(doc(db, "quizzes", id)); }}
              onDuplicate={async q => { const c = { ...q, title: q.title + " (Copy)", createdAt: serverTimestamp() }; delete c.id; await addDoc(collection(db, "quizzes"), c); }}
              onEdit={() => {}}
            />
          )}
          {activeTab === "analytics"   && <AnalyticsSection quizzes={quizzes} />}
          {activeTab === "logs"        && <ActivityLogsSection profile={profile} />}
          {activeTab === "settings"    && <SettingsSection />}
        </div>

        {/* Mobile bottom nav */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-card)] border border-[var(--border-main)] px-2 flex justify-around items-center h-[76px] w-[92%] max-w-sm rounded-[2.5rem] shadow-2xl">
          {NAV.slice(0, 5).map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-2xl transition-all ${activeTab === item.id ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-[var(--text-dim)]"}`}>
              <span className={`text-xl ${activeTab === item.id ? "scale-110" : "opacity-50 grayscale"}`}>{item.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest leading-none">{item.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>
      </main>

      {/* Mobile Drawer */}
      {showMenu && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMenu(false)} />
          <div className="relative w-[85%] max-w-sm bg-[var(--bg-card)] h-full border-l border-[var(--border-main)] shadow-2xl flex flex-col pt-10 px-8 animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-bold uppercase tracking-tight">👑 Super Admin</span>
              <button onClick={() => setShowMenu(false)} className="h-11 w-11 flex items-center justify-center bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl font-bold">✕</button>
            </div>
            <div className="flex items-center justify-between px-2 mb-4">
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Theme</span>
              <ThemeToggle />
            </div>
            <div className="space-y-1.5 overflow-y-auto flex-1">
              {NAV.map(item => (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setShowMenu(false); }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? "bg-indigo-600 text-white font-bold shadow-lg" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)]"}`}>
                  <span className={`text-xl ${activeTab === item.id ? "" : "opacity-50 grayscale"}`}>{item.icon}</span>
                  <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="pt-6 border-t border-[var(--border-main)] pb-10 space-y-3">
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
