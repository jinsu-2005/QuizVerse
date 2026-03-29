import React from "react";
import { Section, StatCard, Badge, Empty } from "./UI.jsx";

export function AnalyticsSection({ quizzes }) {
   if (quizzes.length === 0) {
      return (
        <Section title="Intelligence Command" subtitle="Publish modules to begin student data analysis.">
           <Empty text="Initialize your teaching data by publishing a module." icon="📊" />
        </Section>
      );
   }

   return (
     <div className="flex flex-col gap-10 animate-in fade-in duration-500">
       <Section title="Intelligence Command" subtitle="Real-time data from your active teaching modules.">
         <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Live Sessions" value="23" trend="ACTIVE" icon="🚦" color="indigo" />
            <StatCard label="Success Ratio" value="78%" trend="+4%" icon="🛡️" color="emerald" />
            <StatCard label="Drop-off Ratio" value="12%" trend="-2%" icon="📉" color="amber" />
            <StatCard label="Engagements" value="4.2k" trend="+15%" icon="🔥" color="rose" />
         </div>
       </Section>

       <div className="grid lg:grid-cols-3 gap-8 mb-4">
          <div className="lg:col-span-2 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 md:p-10 shadow-sm relative group transition-all hover:shadow-md">
             <div className="flex justify-between items-center mb-8 border-b border-[var(--border-main)] pb-4 transition-colors">
                <div className="flex flex-col">
                   <h3 className="text-xl font-bold text-[var(--text-main)] tracking-tight uppercase">Department Performance</h3>
                   <span className="text-xs font-semibold text-[var(--text-dim)] uppercase tracking-widest mt-1 opacity-70">Cohort Distribution Index</span>
                </div>
                <div className="flex gap-2">
                   <button className="px-5 py-2.5 rounded-xl bg-indigo-600 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-indigo-500 transition-all">Export Data</button>
                   <button className="px-5 py-2.5 rounded-xl bg-[var(--bg-subtle)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)] border border-[var(--border-main)] hover:bg-[var(--bg-card)] transition-all">Real-time Feed</button>
                </div>
             </div>
             
             {/* Dynamic Theme Bar Chart */}
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
             
             <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-4">
                <div className="flex flex-col">
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-70">Peak Score</span>
                   <span className="text-lg font-bold text-[var(--text-main)] uppercase">IT Sec A</span>
                </div>
                <div className="flex flex-col border-l border-[var(--border-main)] pl-6">
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-70">Engagement</span>
                   <span className="text-lg font-bold text-[var(--text-main)]">14:00+</span>
                </div>
                <div className="flex flex-col border-l border-[var(--border-main)] pl-6">
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-70">Mean Score</span>
                   <span className="text-lg font-bold text-indigo-600 italic">82.5%</span>
                </div>
                <div className="flex flex-col border-l border-[var(--border-main)] pl-6">
                   <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-70">Reliability</span>
                   <span className="text-lg font-bold text-emerald-600">99.9%</span>
                </div>
             </div>
          </div>

          <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-10 flex flex-col gap-8 shadow-sm group hover:shadow-md transition-all">
             <div className="border-b border-[var(--border-main)] pb-4">
               <h3 className="text-xl font-bold text-[var(--text-main)] uppercase tracking-tight">Top Performers</h3>
               <span className="text-xs font-semibold text-[var(--text-dim)] tracking-wider">Student Leaderboard (W14)</span>
             </div>
             <div className="flex flex-col gap-6">
                {[
                  { name: "Arjun Sharma", score: 98, rank: 1, color: "emerald" },
                  { name: "Priya Menon", score: 95, rank: 2, color: "indigo" },
                  { name: "Rahul Kumar", score: 92, rank: 3, color: "indigo" },
                  { name: "Ananya Rao", score: 89, rank: 4, color: "indigo" },
                ].map((s, i) => (
                   <div key={i} className="flex items-center justify-between group/row p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition-colors">
                      <div className="flex items-center gap-4">
                         <div className={`h-10 w-10 rounded-full border border-[var(--border-main)] flex items-center justify-center font-bold text-[var(--text-dim)] bg-[var(--bg-subtle)] group-hover/row:bg-indigo-600 group-hover/row:text-white transition-all`}>
                            {s.rank}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--text-main)] leading-tight group-hover/row:text-indigo-600 transition-colors uppercase pr-2">{s.name}</span>
                            <span className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Honors Student</span>
                         </div>
                      </div>
                      <div className="text-lg font-bold text-[var(--text-main)]">{s.score}%</div>
                   </div>
                ))}
             </div>
             <button className="mt-4 w-full py-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 shadow-md font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95">
                Full Database Access
             </button>
          </div>
       </div>

       <Section title="Module Analytics Library" subtitle="Granular performance feedback for each teaching component.">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {quizzes.slice(0, 6).map(q => (
                 <div key={q.id} className="p-8 rounded-[2rem] border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-indigo-500 hover:shadow-xl transition-all duration-300 group flex flex-col gap-6 overflow-hidden">
                    <div className="flex justify-between items-start">
                       <Badge variant="indigo">{q.department}</Badge>
                       <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">+12% SECTOR GROWTH</div>
                    </div>
                    <div className="flex flex-col gap-1 pr-6 relative">
                       <div className="text-lg font-bold text-[var(--text-main)] leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3rem] uppercase tracking-tight">{q.title}</div>
                       <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">{q.questions?.length || 0} SECTORS • {q.difficulty || "Moderate"}</span>
                       <div className="absolute right-0 top-0 text-2xl grayscale group-hover:grayscale-0 transition-all opacity-20 group-hover:opacity-100">📋</div>
                    </div>
                    <div className="w-full h-px bg-[var(--border-main)]" />
                    <div className="flex justify-between items-end">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest mb-1 opacity-70">Standard Accuracy</span>
                          <span className="text-2xl font-bold text-[var(--text-main)]">82.1%</span>
                       </div>
                       <button className="h-10 w-10 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-dim)] transition-all shadow-sm">
                          📄
                       </button>
                    </div>
                 </div>
              ))}
          </div>
       </Section>
     </div>
   );
}
