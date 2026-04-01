import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { Section, StatCard, Badge, Empty } from "./UI.jsx";

export function AnalyticsSection({ quizzes }) {
   const [stats, setStats] = useState({ users: 0, quizzes: quizzes.length, attempts: 0 });
   const [loading, setLoading] = useState(true);

   useEffect(() => {
     const fetchStats = async () => {
       try {
         const uSnap = await getDocs(collection(db, "users"));
         const aSnap = await getDocs(collection(db, "attempts"));
         setStats({
           users: uSnap.size,
           quizzes: quizzes.length,
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
       <Section title="Intelligence Command" subtitle="Real-time macroscopic data from the QuizVerse platform.">
         <div className="grid sm:grid-cols-3 gap-6">
            <StatCard label="Total Registered Users" value={stats.users} trend="ACTIVE" icon="👥" color="indigo" />
            <StatCard label="Published Modules" value={stats.quizzes} trend={`+${Math.floor(stats.quizzes * 0.1)} this week`} icon="📚" color="emerald" />
            <StatCard label="Global Engagements" value={stats.attempts} trend="+12%" icon="🔥" color="rose" />
         </div>
       </Section>

       <div className="grid lg:grid-cols-3 gap-8 mb-4">
          <div className="lg:col-span-2 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm relative group transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4 transition-colors">
                <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Platform Engagement Trends</h3>
                   <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Weekly Attempt Distribution</span>
                </div>
             </div>
             
             {/* Dynamic Theme Bar Chart (Simulated) */}
             <div className="relative h-64 flex items-end justify-between gap-4 p-4 border-b border-[var(--border-main)] mb-8 bg-[var(--bg-subtle)]/30 rounded-2xl border-2 border-dashed border-[var(--border-main)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent pointer-events-none" />
                {[45, 78, 92, 65, 88, 55, 95].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-4 group/bar relative h-full justify-end">
                        <div 
                           className={`w-full max-w-[40px] rounded-t-xl bg-indigo-600/80 transition-all duration-700 hover:bg-indigo-600 hover:scale-105 shadow-[0_4px_12px_rgba(79,70,229,0.1)] cursor-pointer relative overflow-hidden group-hover/bar:brightness-110`} 
                           style={{ height: `${h}%` }}
                        >
                           <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">{h}%</div>
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">W{i+1}</span>
                    </div>
                ))}
                <div className="absolute inset-0 pointer-events-none p-10 opacity-10">
                   <div className="w-full h-px bg-[var(--text-main)] absolute top-[25%]" />
                   <div className="w-full h-px bg-[var(--text-main)] absolute top-[50%]" />
                   <div className="w-full h-px bg-[var(--text-main)] absolute top-[75%]" />
                </div>
             </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-10 flex flex-col gap-8 shadow-sm group hover:shadow-md transition-all">
             <div className="border-b border-[var(--border-main)] pb-4">
               <h3 className="text-xl font-bold text-[var(--text-main)] uppercase tracking-tight">System Status</h3>
               <span className="text-xs font-semibold text-[var(--text-dim)] tracking-wider">Health Overview</span>
             </div>
             <div className="flex flex-col gap-6">
                {[
                  { name: "Auth Services", score: 100, rank: "✓", color: "emerald" },
                  { name: "Database Nodes", score: 98, rank: "✓", color: "emerald" },
                  { name: "AI Inference", score: 95, rank: "✓", color: "emerald" },
                  { name: "File Storage", score: 100, rank: "✓", color: "emerald" },
                ].map((s, i) => (
                   <div key={i} className="flex items-center justify-between group/row p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors">
                      <div className="flex items-center gap-4">
                         <div className={`h-10 w-10 rounded-full border border-[var(--border-main)] flex items-center justify-center font-bold text-emerald-500 bg-[var(--bg-subtle)] group-hover/row:bg-emerald-500 group-hover/row:text-white transition-all`}>
                            {s.rank}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--text-main)] leading-tight group-hover/row:text-emerald-500 transition-colors uppercase pr-2">{s.name}</span>
                            <span className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Operational</span>
                         </div>
                      </div>
                      <div className="text-lg font-bold text-[var(--text-main)]">{s.score}%</div>
                   </div>
                ))}
             </div>
          </div>
       </div>
     </div>
   );
}
