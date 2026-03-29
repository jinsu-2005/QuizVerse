import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { db } from "../../firebase.js";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const DEPARTMENTS = [
  { label: "Information Technology (IT)", value: "IT" },
  { label: "Computer Science and Engineering (CSE)", value: "CSE" },
  { label: "Electronics and Communication Engineering (ECE)", value: "ECE" },
  { label: "Electrical and Electronics Engineering (EEE)", value: "EEE" },
  { label: "Mechanical Engineering (MECH)", value: "MECH" },
  { label: "Civil Engineering (CIVIL)", value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)", value: "AIDS" },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML" },
];

export default function FirstTimeLogin() {
  const { fbUser, profile, logout } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name: "",
    department: "",
    idNumber: "", // regNo or collegeId
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || fbUser?.displayName || "",
        department: profile.department || "",
        idNumber: profile.regNo || profile.collegeId || "",
      });
    }
  }, [profile, fbUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.department || !form.idNumber) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userRef = doc(db, "users", fbUser.uid);
      const updateData = {
        name: form.name,
        department: form.department,
        verified: true,
        verifiedAt: serverTimestamp(),
      };

      if (profile.role === "teacher") {
        updateData.collegeId = form.idNumber;
      } else {
        updateData.regNo = form.idNumber;
      }

      await updateDoc(userRef, updateData);
      nav(profile.role === "teacher" ? "/teacher" : "/student", { replace: true });
    } catch (err) {
      console.error("Verification error:", err);
      setError("Failed to verify information. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gray-900/70 backdrop-blur-xl border border-gray-800 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-bold text-3xl mx-auto mb-4 shadow-lg shadow-blue-500/20 animate-bounce">Q</div>
            <h1 className="text-3xl font-black tracking-tight mb-2">Welcome to QuizVerse</h1>
            <p className="text-gray-400">Please verify your information to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
            <input
              type="text"
              className="w-full h-14 bg-gray-800 border border-gray-700 rounded-2xl px-5 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Department</label>
            <select
              className="w-full h-14 bg-gray-800 border border-gray-700 rounded-2xl px-5 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium appearance-none cursor-pointer"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
              required
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">
              {profile.role === "teacher" ? "College ID" : "Register Number"}
            </label>
            <input
              type="text"
              className="w-full h-14 bg-gray-800 border border-gray-700 rounded-2xl px-5 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg font-medium"
              placeholder={profile.role === "teacher" ? "Enter your College ID" : "Enter your Register Number"}
              value={form.idNumber}
              onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
              required
            />
          </div>

          {error && <p className="text-red-400 text-sm font-semibold text-center mt-4 bg-red-400/10 py-2 rounded-lg border border-red-400/20">{error}</p>}

          <div className="pt-4 flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? "Verifying..." : "Confirm & Access Dashboard"}
            </button>
            <button
               type="button"
               onClick={logout}
               className="w-full h-12 bg-transparent hover:bg-white/5 text-gray-400 rounded-xl font-semibold text-sm transition-all"
            >
                Sign out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
