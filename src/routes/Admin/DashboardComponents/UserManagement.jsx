import React, { useState, useEffect } from "react";
import { db, firebaseConfig } from "../../../firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Section, SelectSmall, InputSmall, Empty, Badge } from "../../Teacher/DashboardComponents/UI.jsx";

const ROLES = ["student", "teacher", "dept_admin", "inst_admin", "super_admin"];
const DEPARTMENTS = ["FY", "IT", "CSE", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML"];

export function UserManagementSection({ profile }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterDept, setFilterDept] = useState("");

  const [depts, setDepts] = useState([]);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    role: "student",
    department: "",
    regNo: "",
    academicYear: ""
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Load departments from Firestore — fallback to hardcoded list if empty
      const dSnap = await getDocs(collection(db, "departments"));
      const firestoreDepts = dSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
      // If Firestore departments are empty, use the hardcoded list
      const deptList = firestoreDepts.length > 0
        ? firestoreDepts
        : DEPARTMENTS.map(d => ({ id: d, name: d }));
      setDepts(deptList);

      let q = collection(db, "users");
      if (profile.role === "inst_admin" && profile.institute) {
        q = query(q, where("institute", "==", profile.institute));
      } else if (profile.role === "dept_admin") {
        q = query(q, where("department", "==", profile.department));
      }

      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error("UserManagement fetchData error:", e);
    }
    setLoading(false);
  };

  const handleEdit = (u) => {
    setEditingUser(u.id);
    setEditForm({ role: u.role, department: u.department || "" });
  };

  const saveEdit = async (uId) => {
    try {
      await updateDoc(doc(db, "users", uId), editForm);
      await addDoc(collection(db, "activityLogs"), {
        action: "role_change",
        targetUserId: uId,
        performedBy: profile.uid || "admin",
        details: `Changed role to ${editForm.role}`,
        timestamp: serverTimestamp()
      });
      setEditingUser(null);
      fetchData();
    } catch (e) {
      alert("Failed to update user: " + e.message);
    }
  };

  const handleDelete = async (uId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteDoc(doc(db, "users", uId));
      await addDoc(collection(db, "activityLogs"), {
        action: "delete_user",
        targetUserId: uId,
        performedBy: profile.uid || "admin",
        timestamp: serverTimestamp()
      }).catch(() => {});
      fetchData();
    } catch (e) {
      alert("Failed to delete user: " + e.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.name) return alert("Email and Name are required.");
    setAddingUser(true);

    try {
      let defaultPassword = "Student@123";
      if (newUser.role === "teacher") defaultPassword = "Teacher@123";
      if (newUser.role === "dept_admin") defaultPassword = "Department@123";
      if (newUser.role === "inst_admin") defaultPassword = "InstAdmin@123";
      if (newUser.role === "super_admin") defaultPassword = "SuperAdmin@123";

      // Stateless REST API — never touches browser Auth state
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: newUser.email, password: defaultPassword, returnSecureToken: true })
        }
      );

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error?.message || "Failed to create Auth user");

      const newUid = resData.localId;

      const userPayload = {
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        department: (newUser.role === "super_admin" || newUser.role === "inst_admin") ? null : (newUser.department || null),
        institute: "Ponjesly College of Engineering",
        verified: false,
        createdAt: serverTimestamp(),
      };

      if (newUser.role === "student") {
        userPayload.regNo = newUser.regNo;
        userPayload.academicYear = newUser.academicYear;
      }

      await setDoc(doc(db, "users", newUid), userPayload);

      // Log — don't block on failure
      addDoc(collection(db, "activityLogs"), {
        action: "create_user",
        targetUserId: newUid,
        performedBy: profile.uid || "admin",
        details: `Provisioned ${newUser.role} (${newUser.email})`,
        timestamp: serverTimestamp()
      }).catch(() => {});

      alert(`✅ User created! Default password: ${defaultPassword}\nThey must change it on first login.`);
      setShowAddModal(false);
      setNewUser({ email: "", name: "", role: "student", department: "", regNo: "", academicYear: "" });
      fetchData();
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error: " + error.message);
    } finally {
      setAddingUser(false);
    }
  };

  const canEditRole = (targetRole) => {
    if (profile.role === "super_admin") return true;
    if (profile.role === "inst_admin" && targetRole !== "super_admin") return true;
    return false;
  };

  const filtered = users.filter(u => {
    if (filterRole && u.role !== filterRole) return false;
    if (filterDept && u.department !== filterDept) return false;
    const s = search.toLowerCase();
    return (u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s));
  });

  const needsDept = newUser.role !== "super_admin" && newUser.role !== "inst_admin";

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 relative">
      <Section title="User Management" subtitle="Administrate access levels, roles, and records system-wide.">

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          <div className="bg-[var(--bg-card)] rounded-[2rem] border border-[var(--border-main)] p-4 md:p-6 shadow-sm flex flex-col md:flex-row gap-4 flex-1 w-full">
            <InputSmall placeholder="Search by name or email..." value={search} onChange={setSearch} />
            <SelectSmall
              value={filterRole} onChange={setFilterRole}
              options={[{ value: "", text: "All Roles" }, ...ROLES.map(r => ({ value: r, text: r.toUpperCase() }))]}
            />
            <SelectSmall
              value={filterDept} onChange={setFilterDept}
              options={[{ value: "", text: "All Depts" }, ...depts.map(d => ({ value: d.id, text: d.name }))]}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full md:w-auto h-16 md:h-20 px-8 rounded-[2rem] bg-indigo-600 text-white font-bold uppercase tracking-wider shadow-lg hover:bg-indigo-500 transition-all outline-none flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span className="text-xl">+</span> Add User
          </button>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)]/50 border-b border-[var(--border-main)]">
                  <th className="p-5 pl-8 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">User Info</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Role</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)]">Department</th>
                  <th className="p-5 pr-8 text-[10px] font-bold uppercase tracking-widest text-[var(--text-dim)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)]">
                {loading ? (
                  <tr><td colSpan={4} className="p-8 text-center text-[var(--text-dim)] font-bold animate-pulse">Loading Users...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="p-8"><Empty text="No users found" /></td></tr>
                ) : (
                  filtered.map(u => (
                    <tr key={u.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors group">
                      <td className="p-5 pl-8">
                        <div className="flex flex-col">
                          <span className="font-bold text-[var(--text-main)] truncate max-w-[200px]">{u.name || u.displayName}</span>
                          <span className="text-[10px] uppercase tracking-wider text-[var(--text-dim)] opacity-70 group-hover:opacity-100 transition-opacity">{u.email}</span>
                        </div>
                      </td>
                      <td className="p-5">
                        {editingUser === u.id ? (
                          <SelectSmall
                            value={editForm.role}
                            onChange={(v) => setEditForm({ ...editForm, role: v })}
                            options={ROLES.map(r => ({ value: r, text: r }))}
                          />
                        ) : (
                          <Badge variant={u.role?.includes("admin") ? "rose" : u.role === "teacher" ? "indigo" : "slate"}>
                            {u.role}
                          </Badge>
                        )}
                      </td>
                      <td className="p-5">
                        {editingUser === u.id ? (
                          <SelectSmall
                            value={editForm.department}
                            onChange={(v) => setEditForm({ ...editForm, department: v })}
                            options={[{ value: "", text: "None" }, ...depts.map(d => ({ value: d.id, text: d.name }))]}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-[var(--text-dim)]">{u.department || "—"}</span>
                        )}
                      </td>
                      <td className="p-5 pr-8 text-right">
                        {editingUser === u.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => saveEdit(u.id)} className="px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider rounded-lg hover:bg-emerald-500 hover:text-white transition-colors">Save</button>
                            <button onClick={() => setEditingUser(null)} className="px-3 py-1.5 bg-[var(--bg-subtle)] text-[var(--text-dim)] font-bold text-[10px] uppercase tracking-wider rounded-lg border border-[var(--border-main)] hover:bg-[var(--bg-muted)] transition-colors">Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                            {canEditRole(u.role) && (
                              <button onClick={() => handleEdit(u)} className="px-3 py-1.5 bg-[var(--bg-subtle)] text-[var(--text-dim)] font-bold text-[10px] uppercase tracking-wider rounded-xl border border-[var(--border-main)] hover:border-indigo-500 hover:text-indigo-500 transition-colors">Edit</button>
                            )}
                            {profile.role === "super_admin" && (
                              <button onClick={() => handleDelete(u.id)} className="px-3 py-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-rose-500 hover:text-white transition-colors">Delete</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-main)] shadow-2xl overflow-hidden w-full max-w-lg">
            <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-subtle)]/30">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-[var(--text-dim)] hover:text-rose-500 outline-none text-2xl w-8 h-8 flex items-center justify-center transition-colors">&times;</button>
            </div>
            <form onSubmit={handleAddUser} className="p-8 flex flex-col gap-6">

              <div className={`grid ${needsDept ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Role</label>
                  <SelectSmall
                    value={newUser.role}
                    onChange={(v) => setNewUser({ ...newUser, role: v, department: "" })}
                    options={ROLES.map(r => ({ value: r, text: r.toUpperCase() }))}
                  />
                </div>
                {needsDept && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Department</label>
                    <SelectSmall
                      value={newUser.department}
                      onChange={(v) => setNewUser({ ...newUser, department: v })}
                      options={[{ value: "", text: "Select Dept..." }, ...depts.map(d => ({ value: d.id, text: d.name }))]}
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Full Name</label>
                <input
                  type="text" required placeholder="Dr. John Doe"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
                  value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Email Address</label>
                <input
                  type="email" required placeholder="name@ponjesly.edu.in"
                  className="w-full bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
                  value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              {newUser.role === "student" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Reg No</label>
                    <input
                      type="text" required placeholder="961823205032"
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
                      value={newUser.regNo} onChange={e => setNewUser({ ...newUser, regNo: e.target.value })}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1">Academic Year</label>
                    <input
                      type="text" required placeholder="2024-2028"
                      className="w-full bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] rounded-2xl px-5 py-4 text-sm font-semibold outline-none focus:border-indigo-500 transition-colors"
                      value={newUser.academicYear} onChange={e => setNewUser({ ...newUser, academicYear: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">⚠️ Security Notice</span>
                <p className="text-[10px] text-[var(--text-dim)] font-semibold leading-relaxed">
                  Auto-assigned default password:{" "}
                  <code className="text-amber-500 font-bold bg-amber-500/10 px-1 rounded">
                    {newUser.role === "teacher" ? "Teacher@123"
                      : newUser.role === "dept_admin" ? "Department@123"
                      : newUser.role === "inst_admin" ? "InstAdmin@123"
                      : newUser.role === "super_admin" ? "SuperAdmin@123"
                      : "Student@123"}
                  </code>
                  . User must change it on first login.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit" disabled={addingUser}
                  className="px-8 py-4 bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed w-full shadow-lg"
                >
                  {addingUser ? "Creating Account..." : "Create & Initialize Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
