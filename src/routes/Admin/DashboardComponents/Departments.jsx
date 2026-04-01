import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, getDocs, doc, setDoc, deleteDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Section, InputSmall, Empty, Badge } from "../../Teacher/DashboardComponents/UI.jsx";

export function DepartmentManagementSection({ profile }) {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ id: "", name: "", adminId: "" });
  const [editingDept, setEditingDept] = useState(null);
  
  const [admins, setAdmins] = useState([]);

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "departments"));
      const snap = await getDocs(q);
      const deptsRaw = snap.docs.map(d => ({ id: d.id, ...d.data(), studentCount: 0, teacherCount: 0 }));
      
      const uSnap = await getDocs(collection(db, "users"));
      const usersData = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Tally users by department
      usersData.forEach(u => {
         if (u.department) {
            const dept = deptsRaw.find(d => d.id === u.department);
            if (dept) {
               if (u.role === "student") dept.studentCount++;
               if (u.role === "teacher") dept.teacherCount++;
            }
         }
      });
      setDepartments(deptsRaw);
      
      setAdmins(usersData.filter(u => u.role === "dept_admin" || u.role === "teacher"));
    } catch (e) {
      console.error("Dept error", e);
    }
    setLoading(false);
  };

  const saveDept = async (e) => {
    e.preventDefault();
    if (!form.id || !form.name) return alert("ID and Name required");
    
    try {
      if (editingDept) {
        await updateDoc(doc(db, "departments", editingDept), {
          name: form.name,
          adminId: form.adminId
        });
      } else {
        await setDoc(doc(db, "departments", form.id), {
          name: form.name,
          adminId: form.adminId,
          createdAt: serverTimestamp()
        });
      }
      setForm({ id: "", name: "", adminId: "" });
      setEditingDept(null);
      fetchData();
    } catch (err) {
      alert("Failed to save department");
    }
  };

  const handleEdit = (d) => {
    setEditingDept(d.id);
    setForm({ id: d.id, name: d.name, adminId: d.adminId || "" });
  };

  const handleDelete = async (dId) => {
    if (!window.confirm("Delete this department?")) return;
    try {
      await deleteDoc(doc(db, "departments", dId));
      fetchData();
    } catch (err) {
      alert("Failed to delete department");
    }
  };

  const filtered = departments.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Department Infrastructure" subtitle="Register and assign leadership to academic departments.">
        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-8 shadow-sm flex flex-col md:flex-row gap-8 items-start mb-8 transition-colors">
          
          <form className="flex-1 flex flex-col gap-4 w-full" onSubmit={saveDept}>
             <h3 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-tight mb-2">
               {editingDept ? "Update Department" : "Provision New Department"}
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  type="text" 
                  placeholder="Dept Code (e.g. CSE)" 
                  value={form.id} 
                  onChange={(e) => setForm({...form, id: e.target.value})} 
                  disabled={!!editingDept}
                  className="h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm focus:border-indigo-500 outline-none transition-colors disabled:opacity-50"
                  required
                />
                <input 
                  type="text" 
                  placeholder="Full Name (e.g. Computer Science)" 
                  value={form.name} 
                  onChange={(e) => setForm({...form, name: e.target.value})} 
                  className="h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm focus:border-indigo-500 outline-none transition-colors"
                  required
                />
             </div>
             
             <div className="flex items-center gap-4 mt-2">
               <select 
                 value={form.adminId} 
                 onChange={(e) => setForm({...form, adminId: e.target.value})}
                 className="flex-1 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] px-4 text-sm outline-none focus:border-indigo-500 transition-colors"
               >
                 <option value="">Assign Dept Admin (Optional)</option>
                 {admins.map(a => <option key={a.id} value={a.id}>{a.name || a.email} ({a.role})</option>)}
               </select>
               <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-500 transition-colors">
                  {editingDept ? "Update" : "Create"}
               </button>
               {editingDept && (
                 <button type="button" onClick={() => {setEditingDept(null); setForm({id:"",name:"",adminId:""});}} className="h-12 px-6 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-dim)] font-bold text-xs uppercase tracking-widest hover:bg-[var(--bg-muted)] transition-colors">
                    Cancel
                 </button>
               )}
             </div>
          </form>

        </div>

        <div className="flex items-center mb-6 max-w-md">
           <InputSmall placeholder="Search departments..." value={search} onChange={setSearch} />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
             <div className="text-[var(--text-dim)]">Loading matrix...</div>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-full"><Empty text="No departments established." /></div>
          ) : (
            filtered.map(d => (
              <div key={d.id} className="relative group bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all">
                 <div className="flex justify-between items-start mb-4">
                    <div className="text-4xl font-black text-[var(--bg-subtle)] tracking-tighter uppercase drop-shadow-sm opacity-50 absolute right-4 top-2 pointer-events-none">
                       {d.id}
                    </div>
                    <div>
                       <h4 className="text-xl font-bold text-[var(--text-main)] mb-1 relative z-10">{d.name}</h4>
                       <Badge variant="indigo">{d.id}</Badge>
                    </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 mt-4 border-t border-[var(--border-main)] pt-4 relative z-10">
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] opacity-70">Students</span>
                       <span className="text-lg font-bold text-[var(--text-main)]">{d.studentCount || 0}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] uppercase tracking-widest text-[var(--text-dim)] opacity-70">Teachers</span>
                       <span className="text-lg font-bold text-[var(--text-main)]">{d.teacherCount || 0}</span>
                    </div>
                 </div>
                 
                 <div className="text-sm font-semibold text-[var(--text-dim)] border-t border-[var(--border-main)] pt-3 mt-4 relative z-10 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest opacity-60">Assigned Admin</span>
                    <span className="truncate text-indigo-500 font-bold">
                      {d.adminId ? (admins.find(a => a.id === d.adminId)?.name || d.adminId) : "Unassigned"}
                    </span>
                 </div>
                 
                 <div className="mt-6 flex items-center gap-2 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(d)} className="flex-1 py-2 text-xs font-bold text-[var(--text-dim)] uppercase tracking-wider bg-[var(--bg-subtle)] rounded-xl hover:text-indigo-500 border border-[var(--border-main)] transition-colors">Edit</button>
                    {(profile.role === "super_admin" || profile.role === "inst_admin") && (
                      <button onClick={() => handleDelete(d.id)} className="flex-1 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-500/10 rounded-xl hover:bg-rose-500 hover:text-white transition-colors">Drop</button>
                    )}
                 </div>
              </div>
            ))
          )}
        </div>
      </Section>
    </div>
  );
}
