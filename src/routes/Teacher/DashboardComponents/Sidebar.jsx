import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../../firebase";
import { signOut } from "firebase/auth";
import { UserAvatar, ThemeToggle } from "./UI.jsx";

export function SidebarLayout({ children, profile, fbUser, onOpenProfile, activeTab, onTabSelect, requestsCount }) {
  const nav = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const doLogout = async () => {
    try {
      await signOut(auth);
      nav("/signin", { replace: true });
    } catch (e) { console.error(e); }
  };

  const navItems = [
    { id: "home", label: "Dashboard", shortLabel: "Home", icon: "🏠" },
    ...(profile?.role === "super_admin" ? [
      { id: "institutes", label: "Institutes", shortLabel: "Insts", icon: "🏫" },
      { id: "admins", label: "Global Admins", shortLabel: "Admins", icon: "🛡️" },
    ] : []),
    ...(profile?.role === "inst_admin" ? [
      { id: "departments", label: "Departments", shortLabel: "Depts", icon: "🏢" },
    ] : []),
    ...(profile?.role === "dept_admin" ? [
      { id: "teachers", label: "Faculty", shortLabel: "Staff", icon: "🎓" },
    ] : []),
    { id: "quizzes", label: "My Quizzes", shortLabel: "Quizzes", icon: "📚" },
    { id: "create", label: "Create Quiz", shortLabel: "Forge", icon: "✍️" },
    { id: "requests", label: "Requests", shortLabel: "Reqs", icon: "📋", count: requestsCount },
    { id: "analytics", label: "Analytics", shortLabel: "Stats", icon: "📊" },
    { id: "students", label: "Students", shortLabel: "People", icon: "👥" },
  ];

  const handleNav = (id) => {
    onTabSelect(id);
    setShowMobileMenu(false);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden font-sans antialiased transition-colors duration-300">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-[var(--border-main)] bg-[var(--bg-card)] relative z-40 shadow-sm transition-colors duration-300">
        <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => handleNav("home")}>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg transition-transform duration-300 group-hover:scale-110">Q</div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-[var(--text-main)] leading-none">QuizVerse</span>
              <span className="text-[10px] font-bold tracking-wider text-indigo-500 uppercase mt-1">
                {profile?.role === "super_admin" ? "Super Admin" : 
                 profile?.role === "inst_admin" ? "Institutional Admin" : 
                 profile?.role === "dept_admin" ? "Department Admin" : "Instructor Portal"}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? "bg-indigo-600 text-white shadow-xl shadow-indigo-500/20 font-bold" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-main)]"}`}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xl transition-transform group-hover:scale-110 ${activeTab === item.id ? "" : "opacity-50 grayscale"}`}>{item.icon}</span>
                <span className="text-sm uppercase tracking-wide">{item.label}</span>
              </div>
              {item.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === item.id ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'}`}>
                   {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[var(--border-main)] space-y-6">
          <div className="flex items-center justify-between px-2">
             <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">Theme Mode</span>
             <ThemeToggle />
          </div>
          
          <div onClick={onOpenProfile} className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-main)] hover:border-indigo-400 cursor-pointer transition-all duration-300 group">
            <UserAvatar 
              src={profile?.photoURL || fbUser?.photoURL} 
              name={profile?.name || fbUser?.displayName} 
              size="sm" 
              verified={true} 
            />
            <div className="flex-1 min-w-0">
               <div className="text-sm font-bold text-[var(--text-main)] truncate tracking-tight mb-0.5">{profile?.name || fbUser?.displayName || "Teacher"}</div>
               <div className="text-[9px] font-bold text-[var(--text-dim)] uppercase tracking-wider">Faculty Settings</div>
            </div>
            <span className="text-[var(--text-dim)] group-hover:translate-x-1 transition-transform group-hover:text-indigo-500">→</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-main)] relative z-30 overflow-hidden transition-colors duration-300">
        {/* Mobile Header */}
        <div className="lg:hidden p-5 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-card)] sticky top-0 z-50 shadow-sm transition-colors duration-300">
           <div className="flex items-center gap-3" onClick={() => handleNav("home")}>
             <div className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-md">Q</div>
             <span className="font-bold text-[var(--text-main)] uppercase tracking-tighter text-lg">QuizVerse</span>
           </div>
           <div className="flex items-center gap-4">
              <ThemeToggle />
              <button onClick={() => setShowMobileMenu(true)} className="p-2.5 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-dim)] border border-[var(--border-main)] active:scale-95 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-10 scroll-smooth">
           {children}
        </div>

        {/* Bottom Nav - Optimized for Theme */}
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--bg-card)] border border-[var(--border-main)] px-2 flex justify-around items-center h-[76px] w-[92%] max-w-sm rounded-[2.5rem] shadow-2xl transition-all duration-300 ring-1 ring-black/5">
           {navItems.slice(0, 5).map(item => (
             <button key={item.id} onClick={() => handleNav(item.id)} className={`relative flex flex-col items-center justify-center gap-1.5 w-14 h-14 rounded-2xl transition-all duration-300 ${activeTab === item.id ? "text-indigo-600 font-bold bg-indigo-50/50" : "text-[var(--text-dim)]"}`}>
               <span className={`text-xl transition-transform ${activeTab === item.id ? "scale-110" : "opacity-50 grayscale"}`}>{item.icon}</span>
               <span className="text-[9px] font-bold uppercase tracking-widest leading-none text-center truncate w-full px-1">{item.shortLabel}</span>
               {item.count > 0 && <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center border-2 border-[var(--bg-card)]">{item.count}</div>}
             </button>
           ))}
        </div>
      </main>

      {/* Mobile Menu Drawer */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowMobileMenu(false)} />
           <div className="relative w-[85%] max-w-sm bg-[var(--bg-card)] h-full border-l border-[var(--border-main)] shadow-2xl transform transition-transform animate-in slide-in-from-right duration-500 flex flex-col pt-10 px-8">
              <div className="flex justify-between items-center mb-10">
                 <span className="text-xl font-bold text-[var(--text-main)] uppercase tracking-tight">System Menu</span>
                 <button onClick={() => setShowMobileMenu(false)} className="h-11 w-11 flex items-center justify-center bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-2xl text-[var(--text-dim)] font-bold">✕</button>
              </div>
              
              <div className="flex flex-col gap-8 flex-1">
                 <div className="flex items-center gap-4 p-5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-main)] mb-2 shadow-inner">
                    <UserAvatar 
                      src={profile?.photoURL || fbUser?.photoURL} 
                      name={profile?.name || fbUser?.displayName} 
                      size="md" 
                      verified={true} 
                    />
                    <div className="flex flex-col min-w-0">
                       <span className="font-bold text-[var(--text-main)] text-xl leading-tight truncate">{profile?.name || fbUser?.displayName || "Teacher"}</span>
                       <span className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mt-0.5">Verified Instructor</span>
                    </div>
                 </div>

                 <div className="space-y-1.5 overflow-y-auto">
                    <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-[0.2em] ml-3 mb-3">Navigation Map</div>
                    {navItems.map(item => (
                       <button key={item.id} onClick={() => handleNav(item.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === item.id ? "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/20" : "text-[var(--text-dim)] hover:bg-[var(--bg-subtle)]"}`}>
                          <span className={`text-xl ${activeTab === item.id ? "" : "opacity-50 grayscale"}`}>{item.icon}</span>
                          <span className="text-sm font-semibold tracking-wide">{item.label}</span>
                       </button>
                    ))}
                 </div>

                 <div className="space-y-4 pt-8 border-t border-[var(--border-main)] mt-auto pb-10">
                    <button onClick={() => { onOpenProfile(); setShowMobileMenu(false); }} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-main)] text-left shadow-sm">
                       <span className="text-xl">⚙️</span>
                       <span className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">Account Portfolio</span>
                    </button>
                    <button onClick={doLogout} className="w-full flex items-center gap-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-left shadow-sm">
                       <span className="text-xl">🚪</span>
                       <span className="text-sm font-bold uppercase tracking-wide">Terminate Session</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
