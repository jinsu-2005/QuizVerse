import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, limit, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Section, InputSmall, Empty, SelectSmall, Badge, RowSkeleton, UserAvatar } from "./UI.jsx";

export function StaffManagementSection({ profile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [depts, setDepts] = useState([]);
  
  const [filterDept, setFilterDept] = useState(profile?.role === "dept_admin" ? profile.department : "");

  const [form, setForm] = useState({ name: "", email: "", collegeId: "", department: profile?.role === "dept_admin" ? profile.department : "" });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filterDept]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Only fetch departments if allowed (not dept_admin)
      if (profile?.role !== "dept_admin") {
        const dSnap = await getDocs(collection(db, "departments"));
        setDepts(dSnap.docs.map(d => ({ value: d.id, text: d.name })));
      }

      const usersRef = collection(db, "users");
      const constraints = [where("role", "==", "teacher"), limit(100)];
      
      // Dept admin is ALWAYS scoped to their department
      if (profile?.role === "dept_admin" && profile?.department) {
        constraints.push(where("department", "==", profile.department));
      } else if (filterDept) {
        constraints.push(where("department", "==", filterDept));
      } else if (profile?.role === "inst_admin" && profile?.institute) {
        constraints.push(where("institute", "==", profile.institute));
      }

      const q = query(usersRef, ...constraints);
      const snap = await getDocs(q);
      setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Staff fetch error:", e); }
    setLoading(false);
  };

  const saveTeacher = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    try {
      if (editingId) {
        await updateDoc(doc(db, "users", editingId), { ...form });
      } else {
        await addDoc(collection(db, "users"), {
          ...form,
          role: "teacher",
          institute: profile.institute || "Ponjesly College of Engineering",
          createdAt: serverTimestamp()
        });
      }
      setForm({ name: "", email: "", collegeId: "", department: profile?.role === "dept_admin" ? profile.department : "" });
      setEditingId(null);
      fetchData();
    } catch (err) {
      alert("Failed to save teacher");
    }
  };

  const handleEdit = (t) => {
    setEditingId(t.id);
    setForm({ name: t.name || t.displayName || "", email: t.email || "", collegeId: t.collegeId || "", department: t.department || "" });
  };

  const handleDelete = async (tId) => {
    if(!window.confirm("Remove this teacher?")) return;
    try {
      await deleteDoc(doc(db, "users", tId));
      fetchData();
    } catch (e) { alert("Failed to delete"); }
  };

  const filtered = staff.filter(s => 
    (s.name || s.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Faculty Oversight" subtitle={`Manage teaching staff records.`}>
        
        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start mb-8 transition-colors">
          <form className="flex-1 flex flex-col gap-4 w-full" onSubmit={saveTeacher}>
            <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-tight mb-2">
              {editingId ? "Update Faculty Member" : "Add Faculty Member"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm outline-none focus:border-indigo-500 transition-colors" required/>
               <input type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm outline-none focus:border-indigo-500 transition-colors" required/>
               <input type="text" placeholder="College ID" value={form.collegeId} onChange={e => setForm({...form, collegeId: e.target.value})} className="h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm outline-none focus:border-indigo-500 transition-colors"/>
               <select value={form.department} onChange={e => setForm({...form, department: e.target.value})} disabled={profile?.role === "dept_admin"} className="h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm outline-none focus:border-indigo-500 disabled:opacity-50 transition-colors">
                 <option value="">Select Dept...</option>
                 {depts.map(d => <option key={d.value} value={d.value}>{d.text}</option>)}
               </select>
            </div>
            <div className="flex gap-4">
               <button type="submit" className="h-10 px-6 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase hover:bg-indigo-500 transition-colors">{editingId ? "Update" : "Add"}</button>
               {editingId && <button type="button" onClick={() => {setEditingId(null); setForm({name:"",email:"",collegeId:"",department:profile?.role==="dept_admin"?profile.department:""});}} className="h-10 px-6 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-dim)] font-bold text-xs uppercase hover:bg-[var(--bg-muted)] transition-colors">Cancel</button>}
            </div>
          </form>
        </div>

        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-8 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-8">
           <InputSmall placeholder="Search by faculty name or email..." value={search} onChange={setSearch} />
           {profile?.role !== "dept_admin" ? (
             <SelectSmall 
                value={filterDept} 
                onChange={setFilterDept}
                options={[{value:"", text:"All Departments"}, ...depts]}
             />
           ) : (
             <div className="px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-500 font-bold text-xs uppercase tracking-widest">
               Department: {filterDept}
             </div>
           )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             <><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-full">
               <Empty text="No faculty members found." />
             </div>
          ) : (
            filtered.map(member => (
               <div key={member.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-6 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group relative overflow-hidden transition-colors">
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                    <button onClick={() => handleEdit(member)} className="p-2 bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-dim)] rounded-xl hover:text-indigo-500 transition-colors">✏️</button>
                    {(profile.role === "super_admin" || profile.role === "inst_admin" || profile.role === "dept_admin") && (
                      <button onClick={() => handleDelete(member.id)} className="p-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl hover:bg-rose-500 hover:text-white transition-colors">🗑️</button>
                    )}
                  </div>

                  <UserAvatar 
                     src={member.photoURL} 
                     name={member.name || member.displayName || "F"} 
                     size="md" 
                     verified={true} 
                  />
                  <div className="flex flex-col gap-1 w-full truncate">
                     <h4 className="text-xl font-bold text-[var(--text-main)] group-hover:text-indigo-600 transition-colors truncate">{member.name || member.displayName}</h4>
                     <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest">{member.email}</span>
                  </div>
                  <div className="w-full h-px bg-[var(--border-main)]" />
                  <div className="flex gap-2">
                     <Badge variant="indigo">{member.department || "No Dept"}</Badge>
                     {member.collegeId && <Badge variant="slate">{member.collegeId}</Badge>}
                  </div>
               </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
