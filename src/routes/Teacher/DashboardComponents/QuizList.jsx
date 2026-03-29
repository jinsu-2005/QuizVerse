import React from "react";
import { Section, InputSmall, SelectSmall, Badge, Empty, RowSkeleton } from "./UI.jsx";

export function QuizListSection({ 
  search, setSearch, filterDept, setFilterDept, 
  filterYear, setFilterYear, busyList, filtered,
  onDelete, onDuplicate, onEdit
}) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Teaching Modules" subtitle="Manage and monitor all your academic assessment units.">
        
        {/* Search and Filters Bar */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-8 shadow-sm flex flex-col md:flex-row gap-6 items-center transition-all hover:shadow-md transition-colors">
           <div className="flex-1 w-full relative">
              <InputSmall 
                 placeholder="Search by module title or teaching summary..." 
                 value={search} 
                 onChange={setSearch} 
              />
           </div>
           <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <SelectSmall 
                 value={filterDept} 
                 onChange={setFilterDept}
                 options={[
                    { value: "", text: "All Recorded Depts" },
                    { value: "IT", text: "IT" },
                    { value: "CSE", text: "CSE" },
                    { value: "ECE", text: "ECE" },
                    { value: "EEE", text: "EEE" },
                    { value: "MECH", text: "MECH" },
                    { value: "CIVIL", text: "CIVIL" },
                    { value: "AIDS", text: "AIDS" },
                    { value: "AIML", text: "AIML" }
                 ]}
              />
              <SelectSmall 
                 value={filterYear} 
                 onChange={setFilterYear}
                 options={[
                    { value: "", text: "All Academic Years" },
                    { value: "2022 - 2026", text: "2022 - 2026" },
                    { value: "2023 - 2027", text: "2023 - 2027" },
                    { value: "2024 - 2028", text: "2024 - 2028" },
                    { value: "2025 - 2029", text: "2025 - 2029" }
                 ]}
              />
           </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-24">
          {busyList ? (
             <>
               <RowSkeleton />
               <RowSkeleton />
               <RowSkeleton />
             </>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-full">
               <Empty text="No modules found matching your current filters." icon="📚" />
             </div>
          ) : (
             filtered.map(quiz => (
                <div key={quiz.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2rem] p-8 flex flex-col gap-6 shadow-sm hover:border-indigo-400 hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden transition-colors">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all duration-1000" />
                   
                   <div className="flex justify-between items-start relative z-10">
                      <Badge variant={quiz.status === "published" ? "emerald" : "amber"}>{quiz.status}</Badge>
                      <div className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">{quiz.academicYear}</div>
                   </div>

                   <div className="flex flex-col gap-2 relative z-10 flex-1">
                      <h3 className="text-xl font-bold text-[var(--text-main)] leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 md:min-h-[3.5rem] tracking-tight uppercase pr-4">{quiz.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10 transition-colors opacity-80">{quiz.department}</span>
                        <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest bg-[var(--bg-subtle)] px-2 py-0.5 rounded border border-[var(--border-main)] transition-colors opacity-80">{quiz.difficulty || "Moderate"}</span>
                      </div>
                      <p className="text-sm font-medium text-[var(--text-dim)] line-clamp-2 italic pr-4 opacity-70 transition-colors">"{quiz.description || "Educational module for current session."}"</p>
                   </div>

                   <div className="h-px bg-[var(--border-main)] w-full relative z-10 transition-colors" />

                   <div className="flex justify-between items-center relative z-10">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Question Count</span>
                         <span className="text-lg font-bold text-[var(--text-main)] transition-colors">{quiz.questions?.length || 0} SECTORS</span>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={() => onEdit(quiz)} className="h-10 w-10 bg-[var(--bg-subtle)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-dim)] hover:text-indigo-600 flex items-center justify-center transition-all shadow-sm" title="Edit Module">✏️</button>
                         <button onClick={() => onDuplicate(quiz)} className="h-10 w-10 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl text-[var(--text-dim)] flex items-center justify-center transition-all shadow-sm" title="Create Duplicate">📑</button>
                         <button onClick={() => onDelete(quiz.id)} className="h-10 w-10 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-rose-500 flex items-center justify-center transition-all shadow-sm" title="Archive Delete">🗑️</button>
                      </div>
                   </div>
                </div>
             ))
          )}
        </div>
      </Section>
    </div>
  );
}
