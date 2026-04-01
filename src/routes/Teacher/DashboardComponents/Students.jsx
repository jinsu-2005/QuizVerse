import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, limit, doc, updateDoc } from "firebase/firestore";
import { Section, InputSmall, SelectSmall, Empty, Badge, RowSkeleton, UserAvatar } from "./UI.jsx";
import { BulkUploadStudents } from "./BulkUploadStudents.jsx";

export function StudentManagementSection({ profile }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // If dept_admin, force filterDept to their department
  const isDeptAdmin = profile?.role === "dept_admin";
  const [filterDept, setFilterDept] = useState(isDeptAdmin ? profile?.department : "");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", regNo: "", academicYear: "" });
  
  const [showBulkModal, setShowBulkModal] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, [filterDept, profile]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let q;
      const usersRef = collection(db, "users");
      const constraints = [where("role", "==", "student"), limit(100)];
      
      if (filterDept) constraints.push(where("department", "==", filterDept));
      
      if (profile?.role === "inst_admin" && profile?.institute) {
        constraints.push(where("institute", "==", profile.institute));
      }

      q = query(usersRef, ...constraints);
      const snap = await getDocs(q);
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleEdit = (s) => {
    setEditingId(s.id);
    setEditForm({ name: s.name || s.displayName || "", regNo: s.regNo || "", academicYear: s.academicYear || "" });
  };

  const saveEdit = async (sId) => {
    try {
      await updateDoc(doc(db, "users", sId), editForm);
      setEditingId(null);
      fetchStudents();
    } catch (e) { alert("Failed to save"); }
  };

  const filtered = students.filter(s => 
    (s.name || s.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.regNo || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Cohort Governance" subtitle="Manage and verify the student database within your faculty.">
        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-8 shadow-sm flex flex-col md:flex-row gap-4 items-center transition-all hover:shadow-md transition-colors">
           <InputSmall placeholder="Search by name, email, or reg. no..." value={search} onChange={setSearch} />
           {!isDeptAdmin && (
             <SelectSmall 
                value={filterDept} 
                onChange={setFilterDept}
                options={[
                  { value: "", text: "All Recorded Depts" },
                  { value: "FY", text: "FY (First Year)" },
                  { value: "IT", text: "IT" },
                  { value: "CSE", text: "CSE" },
                  { value: "ECE", text: "ECE" },
                  { value: "EEE", text: "EEE" },
                  { value: "MECH", text: "MECH" },
                  { value: "CIVIL", text: "CIVIL" },
                  { value: "AIDS", text: "AIDS" },
                  { value: "AIML", text: "AIML" },
                ]}
             />
           )}
           {isDeptAdmin && (
             <div className="px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-500 font-bold text-xs uppercase tracking-widest">
               Department: {filterDept}
             </div>
           )}
           <button 
             onClick={() => setShowBulkModal(true)}
             className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-[var(--bg-main)] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 hover:scale-105 rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all outline-none md:ml-auto"
           >
             Bulk CSV Upload
           </button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {loading ? (
             <><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-full"><Empty text="No recorded students matched your search criteria." /></div>
          ) : (
            filtered.map(student => (
               <div key={student.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-6 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group relative overflow-hidden transition-colors">
                  <div className="absolute top-6 right-6 flex gap-2">
                     {(profile.role === "inst_admin" || profile.role === "super_admin" || profile.role === "dept_admin") && (
                       <button onClick={() => editingId === student.id ? setEditingId(null) : handleEdit(student)} className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-subtle)] border border-[var(--border-main)] rounded-lg hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">
                         {editingId === student.id ? "Cancel" : "Edit"}
                       </button>
                     )}
                     <Badge variant={student.emailVerified ? "emerald" : "amber"}>
                        {student.emailVerified ? "Verified" : "Provisional"}
                     </Badge>
                  </div>
                  
                  <UserAvatar src={student.photoURL} name={student.name || student.displayName || "S"} size="md" verified={student.emailVerified} />
                  
                  {editingId === student.id ? (
                    <div className="w-full flex flex-col gap-2">
                      <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" className="h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-main)] px-2 text-sm outline-none" />
                      <input type="text" value={editForm.regNo} onChange={e => setEditForm({...editForm, regNo: e.target.value})} placeholder="Reg No" className="h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-main)] px-2 text-sm outline-none" />
                      <input type="text" value={editForm.academicYear} onChange={e => setEditForm({...editForm, academicYear: e.target.value})} placeholder="Academic Year" className="h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-main)] px-2 text-sm outline-none" />
                      <button onClick={() => saveEdit(student.id)} className="w-full h-8 mt-2 rounded-lg bg-indigo-600 font-bold text-xs uppercase text-white hover:bg-indigo-500">Save Changes</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1 w-full px-2">
                         <h4 className="text-xl font-bold text-[var(--text-main)] leading-tight group-hover:text-indigo-600 truncate">{student.name || student.displayName || "Student Anonymous"}</h4>
                         <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">{student.email || "No register entry"}</span>
                         <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Reg: {student.regNo || "N/A"} • Year: {student.academicYear || "N/A"}</span>
                      </div>
                      
                      <div className="w-full h-px bg-[var(--border-main)]" />
                      
                      <div className="grid grid-cols-2 gap-4 w-full">
                         <div className="flex flex-col gap-1 items-center bg-[var(--bg-subtle)] p-4 rounded-2xl border border-[var(--border-main)]">
                            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Dept</span>
                            <span className="text-lg font-bold text-[var(--text-main)] transition-colors line-clamp-1">{student.department || "—"}</span>
                         </div>
                         <div className="flex flex-col gap-1 items-center bg-[var(--bg-subtle)] p-4 rounded-2xl border border-[var(--border-main)] transition-colors">
                            <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Rank</span>
                            <span className="text-lg font-bold text-emerald-600 transition-colors">A</span>
                         </div>
                      </div>
                      
                      <button className="w-full py-3.5 rounded-xl bg-[var(--contrast-surface)] text-[var(--contrast-text)] font-bold text-xs uppercase tracking-widest shadow-md transition-all active:scale-95">
                         Review Full Portfolio
                      </button>
                    </>
                  )}
               </div>
            ))
          )}
        </div>
      </Section>
      
      {showBulkModal && (
         <BulkUploadStudents 
           profile={profile}
           onComplete={() => { setShowBulkModal(false); fetchStudents(); }}
           onClose={() => setShowBulkModal(false)}
         />
      )}
    </div>
  );
}
