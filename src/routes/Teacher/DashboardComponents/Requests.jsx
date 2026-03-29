import React from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebase";
import { Section, Badge, Empty, RowSkeleton, UserAvatar } from "./UI.jsx";

export function StudentRequestsSection({ requests, busyReqs }) {
  const handleAction = async (id, status) => {
    try {
      await updateDoc(doc(db, "editRequests", id), { status, updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Validation Requests" subtitle="Process and authorize edits proposed by teaching assistants or student representatives.">
        <div className="grid lg:grid-cols-3 gap-8 mb-8 transition-colors">
           <div className="lg:col-span-2 flex flex-col gap-4">
              {busyReqs ? (
                <>
                  <RowSkeleton />
                  <RowSkeleton />
                </>
              ) : requests.length === 0 ? (
                <Empty text="All validation queues have been successfully processed." icon="🛡️" />
              ) : (
                requests.map(req => (
                  <div key={req.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start hover:border-indigo-400 group transition-all shadow-sm transition-colors">
                     <div className="flex items-center gap-4 border-r border-[var(--border-main)] pr-8 min-w-[240px]">
                        <UserAvatar 
                          src={req.studentPhotoURL} 
                          name={req.studentName} 
                          size="md" 
                          verified={false} 
                        />
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-[var(--text-main)] group-hover:text-indigo-600 transition-colors uppercase pr-2">{req.studentName}</span>
                           <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">{req.department} Rep</span>
                        </div>
                     </div>
                     
                     <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-2 mb-2">
                           <Badge variant="amber">{req.type || "EDIT"}</Badge>
                           <span className="text-[11px] font-bold text-[var(--text-dim)] uppercase tracking-widest">SUBMITTED {new Date(req.createdAt?.toMillis()||0).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-lg font-bold text-[var(--text-main)] leading-tight pr-4 uppercase tracking-tighter">Proposed Modification: {req.quizTitle}</h4>
                        <div className="p-4 bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-xl text-xs font-semibold text-[var(--text-dim)] italic leading-relaxed transition-colors">
                           "{req.reason || "Standard curriculum update requested for this academic session."}"
                        </div>
                     </div>
                     
                     <div className="flex flex-row md:flex-col gap-3 shrink-0">
                        <button onClick={() => handleAction(req.id, "approved")} className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest shadow-md transition-all active:scale-95">Approve</button>
                        <button onClick={() => handleAction(req.id, "rejected")} className="px-6 py-2.5 rounded-xl bg-[var(--bg-card)] border-2 border-[var(--border-main)] text-[var(--text-dim)] hover:text-rose-600 hover:border-rose-200 font-bold text-xs uppercase tracking-widest transition-all">Dismiss</button>
                     </div>
                  </div>
                ))
              )}
           </div>
           
           <div className="flex flex-col gap-6">
              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 shadow-sm transition-colors">
                 <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 uppercase tracking-tight">System Summary</h3>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-4">
                       <span className="text-sm font-semibold text-[var(--text-dim)]">Unprocessed</span>
                       <span className="text-lg font-bold text-amber-600">{requests.length}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[var(--border-main)] pb-4">
                       <span className="text-sm font-semibold text-[var(--text-dim)]">Avg TAT</span>
                       <span className="text-lg font-bold text-[var(--text-main)]">4.2h</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-sm font-semibold text-[var(--text-dim)]">Trust Index</span>
                       <span className="text-lg font-bold text-emerald-600">92%</span>
                    </div>
                 </div>
              </div>
              <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-3xl transition-colors">
                 <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Instructor Note</p>
                 <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed italic opacity-80 transition-colors">"Approval of a request will instantly modify the live module for all students in the assigned cohort."</p>
              </div>
           </div>
        </div>
      </Section>
    </div>
  );
}
