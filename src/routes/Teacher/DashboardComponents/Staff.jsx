import React, { useState, useEffect } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Section, InputSmall, Empty, Badge, RowSkeleton, UserAvatar } from "./UI.jsx";

export function StaffManagementSection({ profile }) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const isDeptAdmin = profile?.role === "dept_admin";
  const dept = profile?.department || "";

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        let q;
        const usersRef = collection(db, "users");
        const constraints = [where("role", "==", "teacher"), limit(50)];
        
        if (dept) {
          constraints.push(where("department", "==", dept));
        }

        q = query(usersRef, ...constraints);
        const snap = await getDocs(q);
        setStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchStaff();
  }, [dept]);

  const filtered = staff.filter(s => 
    (s.name || s.displayName || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500">
      <Section title="Faculty Oversight" subtitle={`Manage teaching staff within the ${dept} department.`}>
        <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-8 shadow-sm flex flex-col md:flex-row gap-4 items-center mb-8">
           <InputSmall 
              placeholder="Search by faculty name or email..." 
              value={search} 
              onChange={setSearch} 
           />
           <div className="px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-500 font-bold text-xs uppercase tracking-widest">
             Department: {dept}
           </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
             <><RowSkeleton /><RowSkeleton /><RowSkeleton /></>
          ) : filtered.length === 0 ? (
             <div className="md:col-span-full">
               <Empty text="No faculty members found in this department." />
             </div>
          ) : (
            filtered.map(member => (
               <div key={member.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] p-8 flex flex-col items-center text-center gap-6 shadow-sm hover:border-indigo-400 hover:shadow-xl transition-all group">
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
                     <Badge variant="indigo">Faculty</Badge>
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
