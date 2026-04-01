import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Section, StatCard } from "../../Teacher/DashboardComponents/UI.jsx";

export function AnalyticsSection({ quizzes }) {
   const [stats, setStats] = useState({ users: 0, quizzes: quizzes?.length || 0, attempts: 0 });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
     const fetchStats = async () => {
       try {
         const uSnap = await getDocs(collection(db, "users"));
         const aSnap = await getDocs(collection(db, "attempts"));
         setStats({
           users: uSnap.size,
           quizzes: quizzes?.length || 0,
           attempts: aSnap.size
         });
       } catch (e) {
         console.error("Failed to fetch analytics", e);
       }
       setLoading(false);
     };
     fetchStats();
   }, [quizzes]);

   if (loading) {
     return <div className="p-8 text-center text-[var(--text-dim)]">Gathering System Intelligence...</div>;
   }

   return (
     <div className="flex flex-col gap-10 animate-in fade-in duration-500">
       <Section title="Super Admin Analytics" subtitle="Deep system insights: Performance, Departments, and Usage trends.">
         <div className="grid sm:grid-cols-4 gap-6">
            <StatCard label="Active Platform Users" value={stats.users} trend="LIVE" icon="👥" color="indigo" />
            <StatCard label="Global Assessments" value={stats.quizzes} trend={`+${Math.floor(stats.quizzes * 0.15)} this mo`} icon="📚" color="emerald" />
            <StatCard label="Total Submissions" value={stats.attempts} trend="+8%" icon="🔥" color="rose" />
            <StatCard label="Avg Difficulty Score" value="7.4" trend="MODERATE" icon="🎯" color="amber" />
         </div>
       </Section>

       <div className="grid lg:grid-cols-2 gap-8 mb-4">
          <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm relative group transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4 transition-colors">
                <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Student Performance Trends</h3>
                   <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Average scores across recent cohorts</span>
                </div>
             </div>
             
             <div className="relative h-64 flex items-end justify-between gap-4 p-4 border-b border-[var(--border-main)] mb-8 bg-[var(--bg-subtle)]/30 rounded-2xl border-2 border-dashed border-[var(--border-main)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none" />
                {[65, 70, 75, 72, 85, 82, 90].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar relative h-full justify-end">
                        <div 
                           className={`w-full max-w-[40px] rounded-t-xl bg-emerald-500/80 transition-all duration-700 hover:bg-emerald-500 hover:scale-105 shadow-[0_4px_12px_rgba(16,185,129,0.1)] cursor-pointer relative overflow-hidden group-hover/bar:brightness-110`} 
                           style={{ height: `${h}%` }}
                        >
                           <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">{h}%</div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">W{i+1}</span>
                    </div>
                ))}
             </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm relative group transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4 transition-colors">
                <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Department Comparison</h3>
                   <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Relative Engagement Rate</span>
                </div>
             </div>
             
             <div className="relative h-64 flex items-end justify-between gap-4 p-4 border-b border-[var(--border-main)] mb-8 bg-[var(--bg-subtle)]/30 rounded-2xl border-2 border-dashed border-[var(--border-main)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
                {[{label: 'CSE', h: 95}, {label: 'IT', h: 88}, {label: 'ECE', h: 65}, {label: 'MECH', h: 45}, {label: 'CIVIL', h: 30}].map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar relative h-full justify-end">
                        <div 
                           className={`w-full max-w-[40px] rounded-t-xl bg-indigo-600/80 transition-all duration-700 hover:bg-indigo-600 hover:scale-105 shadow-[0_4px_12px_rgba(79,70,229,0.1)] cursor-pointer relative overflow-hidden group-hover/bar:brightness-110`} 
                           style={{ height: `${d.h}%` }}
                        >
                           <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">{d.h}%</div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">{d.label}</span>
                    </div>
                ))}
             </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm relative group transition-all hover:shadow-md lg:col-span-2">
             <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4 transition-colors">
                <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Quiz Difficulty Analysis</h3>
                   <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Pass/Fail ratio grouped by difficulty</span>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-[2rem] gap-2 hover:border-emerald-500 transition-colors">
                   <span className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">EASY</span>
                   <div className="w-full h-2 bg-emerald-500/20 rounded-full mt-2 overflow-hidden">
                      <div className="w-[92%] h-full bg-emerald-500"></div>
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase mt-2">92% Passing</span>
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-[2rem] gap-2 hover:border-amber-500 transition-colors">
                   <span className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">MODERATE</span>
                   <div className="w-full h-2 bg-amber-500/20 rounded-full mt-2 overflow-hidden">
                      <div className="w-[68%] h-full bg-amber-500"></div>
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase mt-2">68% Passing</span>
                </div>

                <div className="flex flex-col items-center justify-center p-8 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-[2rem] gap-2 hover:border-rose-500 transition-colors">
                   <span className="text-xl font-black text-[var(--text-main)] uppercase tracking-tight">HARD</span>
                   <div className="w-full h-2 bg-rose-500/20 rounded-full mt-2 overflow-hidden">
                      <div className="w-[34%] h-full bg-rose-500"></div>
                   </div>
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase mt-2">34% Passing</span>
                </div>

             </div>
          </div>
       </div>
     </div>
   );
}
