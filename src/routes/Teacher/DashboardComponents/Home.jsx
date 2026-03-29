import React, { useEffect, useState } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Section, StatCard, UserAvatar, Badge } from "./UI.jsx";

export function HomeSection({ quizzes, requestsCount, profile, fbUser }) {
  const [attemptsInfo, setAttemptsInfo] = useState({ total: 0, loading: true });

  useEffect(() => {
    let unmounted = false;
    const load = async () => {
      if (quizzes.length === 0) {
        if (!unmounted) setAttemptsInfo({ total: 0, loading: false });
        return;
      }
      try {
        const quizIds = quizzes.map(q => q.id);
        const chunks = [];
        for (let i = 0; i < quizIds.length; i += 10) chunks.push(quizIds.slice(i, i + 10));
        
        let totalAttempts = 0;
        for (const chunk of chunks) {
           const qRef = query(collection(db, "quizAttempts"), where("quizId", "in", chunk));
           const snap = await getDocs(qRef);
           totalAttempts += snap.docs.length;
        }
        if (!unmounted) setAttemptsInfo({ total: totalAttempts, loading: false });
      } catch (e) {
        if (!unmounted) setAttemptsInfo({ total: "-", loading: false });
      }
    };
    load();
    return () => { unmounted = true; };
  }, [quizzes]);

  const activeQuizzes = quizzes.filter(q => q.status === "published").length;
  const draftQuizzes = quizzes.filter(q => q.status !== "published").length;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Professional Profile Hero */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] p-8 md:p-10 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <UserAvatar 
                src={profile?.photoURL || fbUser?.photoURL} 
                name={profile?.name || fbUser?.displayName || "Instructor"} 
                size="lg" 
                verified={true} 
            />
            
            <div className="flex-1 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-main)] tracking-tight">
                        Welcome, {profile?.name?.split(' ')[0] || fbUser?.displayName?.split(' ')[0] || "Professor"}
                    </h1>
                    <Badge variant="emerald">Verified Faculty</Badge>
                </div>
                <p className="text-[var(--text-dim)] font-medium leading-relaxed max-w-2xl">
                    You have <span className="text-indigo-600 font-bold">{quizzes.length}</span> active modules, <span className="text-amber-600 font-bold">{requestsCount}</span> pending requests, and <span className="text-emerald-600 font-bold">{attemptsInfo.loading ? "..." : attemptsInfo.total}</span> total student attempts recorded.
                </p>
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-8">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-50">Department</span>
                        <span className="text-sm font-semibold text-[var(--text-main)]">{profile?.department || "General"}</span>
                    </div>
                    <div className="flex flex-col border-l border-[var(--border-main)] pl-8">
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-50">Academic Cycle</span>
                        <span className="text-sm font-semibold text-[var(--text-main)]">{profile?.academicYear || "Active Session"}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-2 shrink-0">
               <button className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-xl text-sm font-bold shadow-sm transition-all hover:opacity-90">
                  Edit Profile
               </button>
               <button className="bg-[var(--bg-card)] text-[var(--text-dim)] border border-[var(--border-main)] px-6 py-3 rounded-xl text-sm font-bold transition-all hover:bg-[var(--bg-subtle)]">
                  Guide / Support
               </button>
            </div>
        </div>
      </div>

      <Section title="Learning Statistics" subtitle="Real-time metrics from your teaching modules.">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Modules" value={quizzes.length} icon="📚" color="indigo" />
          <StatCard label="Active Now" value={activeQuizzes} icon="✅" color="emerald" trend="LIVE" />
          <StatCard label="Pending Drafts" value={draftQuizzes} icon="✏️" color="amber" />
          <StatCard label="Total Submissions" value={attemptsInfo.loading ? "..." : attemptsInfo.total} icon="📝" color="rose" />
        </div>
      </Section>

      <div className="grid lg:grid-cols-2 gap-8 mb-4">
          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] p-8 shadow-sm transition-colors">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-tight">Recent Activity Log</h3>
                <button className="text-xs font-bold text-indigo-600 hover:underline">View History</button>
             </div>
             <div className="flex flex-col gap-4">
                {quizzes.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-dim)] text-sm font-medium italic">No activity recorded yet...</div>
                ) : (
                  quizzes.slice(0, 3).map(q => (
                    <div key={q.id} className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-subtle)] flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center text-xl shadow-sm">📑</div>
                            <div>
                                <div className="text-sm font-bold text-[var(--text-main)] leading-none mb-1">{q.title}</div>
                                <div className="text-[10px] font-medium text-[var(--text-dim)] uppercase tracking-wider">{q.status === "published" ? "Published" : "Modified"} • {fmtDate(q.createdAt)}</div>
                            </div>
                        </div>
                        <Badge variant={q.status === "published" ? "emerald" : "amber"}>{q.status}</Badge>
                    </div>
                  ))
                )}
             </div>
          </div>
          
          <div className="bg-indigo-600/5 rounded-3xl border border-indigo-500/20 p-8 shadow-sm transition-colors">
             <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs shadow-sm">🤖</div>
                <h3 className="text-lg font-bold text-indigo-600 tracking-tight">AI Teaching Assistant</h3>
             </div>
             <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-indigo-500/20 shadow-sm mb-6 transition-colors">
                <p className="text-[var(--text-main)] text-sm italic font-medium leading-relaxed">
                   "Your students seem to struggle with 'Recursive Functions'. I've identified 3 gaps in the last quiz. Would you like me to generate a remedial module?"
                </p>
             </div>
             <div className="flex gap-2">
                <button className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all">
                   Review Analysis
                </button>
                <button className="flex-1 py-3 bg-[var(--bg-card)] text-indigo-600 border border-indigo-500/20 rounded-xl text-xs font-bold transition-all hover:bg-[var(--bg-subtle)]">
                   Dismiss
                </button>
             </div>
          </div>
      </div>
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return "";
  try {
    if (typeof ts === "object" && typeof ts.toDate === "function") return ts.toDate().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  } catch (e) { return "" }
}
