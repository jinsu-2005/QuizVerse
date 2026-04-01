import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { db, auth } from "../../firebase.js";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updatePassword } from "firebase/auth";

/* ── Constants ───────────────────────────────────────── */
const DEPARTMENTS = [
  { label: "First Year - Foundation (FY)",                        value: "FY"    },
  { label: "Information Technology (IT)",                         value: "IT"    },
  { label: "Computer Science and Engineering (CSE)",              value: "CSE"   },
  { label: "Electronics and Communication Engineering (ECE)",     value: "ECE"   },
  { label: "Electrical and Electronics Engineering (EEE)",        value: "EEE"   },
  { label: "Mechanical Engineering (MECH)",                       value: "MECH"  },
  { label: "Civil Engineering (CIVIL)",                           value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)",     value: "AIDS"  },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML"  },
];

const ACADEMIC_YEARS = ["2023-2027", "2024-2028", "2025-2029", "2026-2030"];
const YEARS_OF_STUDY = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const GENDERS = ["Male", "Female", "Prefer not to say"];
const INSTITUTE = "Ponjesly College of Engineering";

/* ── Locked field component ──────────────────────────── */
function LockedField({ label, value }) {
  return (
    <div>
      <label className="ftl-label">{label}</label>
      <div className="ftl-locked">
        <span className="ftl-locked-value">{value || "—"}</span>
        <span className="ftl-lock-badge">
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          Locked
        </span>
      </div>
    </div>
  );
}

/* ── Editable tag ────────────────────────────────────── */
function EditTag() {
  return <span className="ftl-editable-tag">Editable</span>;
}

/* ── Main Component ──────────────────────────────────── */
export default function FirstTimeLogin() {
  const { fbUser, profile, logout } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    name:         "",
    email:        "",
    phone:        "",
    dob:          "",
    gender:       "",
    department:   "",
    academicYear: "",
    yearOfStudy:  "",
    regNo:        "",
    collegeId:    "",
    newPassword:  "",
  });

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* Pre-fill from profile */
  useEffect(() => {
    if (!profile) return;
    setForm({
      name:         profile.name         || fbUser?.displayName || "",
      email:        profile.email        || fbUser?.email       || "",
      phone:        profile.phone        || "",
      dob:          profile.dob          || "",
      gender:       profile.gender       || "",
      department:   profile.department   || "",
      academicYear: profile.academicYear || "",
      yearOfStudy:  profile.yearOfStudy  || "",
      // ⚠️ regNo / collegeId may be stored as numbers in Firestore.
      // Always coerce to string so .trim() doesn't throw.
      regNo:        String(profile.regNo    ?? ""),
      collegeId:    String(profile.collegeId ?? ""),
    });
  }, [profile, fbUser]);

  const isAd = ["super_admin", "inst_admin"].includes(profile?.role);
  const isDeptAd = profile?.role === "dept_admin";
  const isTeacher = profile?.role === "teacher";
  const isStudent = profile?.role === "student";

  /* Auto-navigate when Firestore confirms verified=true */
  useEffect(() => {
    if (profile?.verified === true) {
      let dest = "/student";
      if (profile.role === "super_admin") dest = "/admin";
      else if (profile.role === "inst_admin") dest = "/inst-admin";
      else if (profile.role === "dept_admin") dest = "/dept-admin";
      else if (profile.role === "teacher") dest = "/teacher";

      setSaveSuccess(true);
      setTimeout(() => nav(dest, { replace: true }), 1500);
    }
  }, [profile?.verified, profile?.role]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  /* ── Submit ──────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim())  { setError("Full name is required.");    return; }
    if (!form.email.trim()) { setError("Email is required.");         return; }
    if (!form.gender)       { setError("Gender is required.");        return; }
    if (!form.dob)          { setError("Date of birth is required."); return; }

    if (isStudent) {
      if (!form.regNo.trim())   { setError("Register Number is required.");  return; }
      if (!form.academicYear)   { setError("Academic Year is required.");    return; }
      if (!form.yearOfStudy)    { setError("Year of Study is required.");    return; }
      if (!form.phone.trim())   { setError("Phone number is required.");     return; }
      if (!form.department)     { setError("Department is required.");       return; }
    } else if (isTeacher || isDeptAd) {
      if (isTeacher && !form.collegeId.trim()) { setError("College ID is required."); return; }
      if (!form.department) { setError("Department is required."); return; }
    }

    if (!form.newPassword || form.newPassword.length < 6) {
      setError("Please set a new secure password (at least 6 characters).");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name:       form.name.trim(),
        email:      form.email.trim(),
        phone:      form.phone.trim(),
        dob:        form.dob,
        gender:     form.gender,
        institute:  INSTITUTE,
        department: form.department || null,
        verified:   true,
        verifiedAt: serverTimestamp(),
      };

      if (isStudent) {
        updateData.regNo        = form.regNo.trim();
        updateData.academicYear = form.academicYear;
        updateData.yearOfStudy  = form.yearOfStudy;
      } else if (isTeacher || isDeptAd) {
        if (isTeacher) updateData.collegeId = form.collegeId.trim();
      }

      await updateDoc(doc(db, "users", fbUser.uid), updateData);
      
      // Update the Auth password
      await updatePassword(auth.currentUser, form.newPassword);
      
      // Navigation is handled by the useEffect watching profile.verified.
      // The Firestore onSnapshot in AuthContext will deliver the update,
      // which triggers the useEffect above to navigate to the dashboard.
    } catch (err) {
      console.error("Verification error:", err);
      setError(`Failed to save: ${err.message}`);
      setLoading(false);
    }
  };

  if (!profile) return (
    <div className="ftl-bg">
      <p className="ftl-loading">Loading…</p>
    </div>
  );

  return (
    <div className="ftl-bg">
      <div className="ftl-card">
        {/* Glow */}
        <div className="ftl-glow ftl-glow-1" />
        <div className="ftl-glow ftl-glow-2" />

        {/* Header */}
        <div className="ftl-header">
          <div className="ftl-icon">Q</div>
          <h1 className="ftl-title">Welcome to QuizVerse</h1>
          <p className="ftl-subtitle">
            {isTeacher
              ? "Verify your faculty profile to access the teaching workspace."
              : "Verify your student profile to access your dashboard."}
          </p>
          <span className="ftl-role-badge">
            {isTeacher ? "👨‍🏫 Faculty" : isStudent ? "🎓 Student" : isAd ? "🛡️ System Admin" : "🏢 Dept Admin"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="ftl-form">

          {/* ── ALWAYS LOCKED: Institution ── */}
          <div className="ftl-col-full">
            <LockedField label="Institution" value={INSTITUTE} />
          </div>

          {/* ── ROW: Name + Email ── */}
          <div className="ftl-grid-2">
            <div>
              <label className="ftl-label">Full Name</label>
              <input type="text" className="ftl-input" value={form.name}
                onChange={set("name")} placeholder="Your full name" required />
            </div>
            <div>
              <label className="ftl-label">Email Address <EditTag /></label>
              <input type="email" className="ftl-input" value={form.email}
                onChange={set("email")} placeholder="your@email.com" required />
            </div>
          </div>
          
          <div className="ftl-col-full">
            <label className="ftl-label">Set New Password <EditTag /></label>
            <input type="password" className="ftl-input" value={form.newPassword}
              onChange={set("newPassword")} placeholder="Create a secure new password" required minLength={6} />
            <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider block mt-2 ml-1">Must be at least 6 characters. Mandatory reset to replace generic default passwords.</span>
          </div>

          {/* ── ROW: DOB + Gender ── */}
          <div className="ftl-grid-2">
            <div>
              <label className="ftl-label">Date of Birth</label>
              <input type="date" className="ftl-input" value={form.dob}
                onChange={set("dob")} required />
            </div>
            <div>
              <label className="ftl-label">Gender</label>
              <select className="ftl-select" value={form.gender}
                onChange={set("gender")} required>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* ── STUDENT FIELDS ── */}
          {isStudent && (
            <>
              {/* ROW: Register No (locked) + Phone */}
              <div className="ftl-grid-2">
                <LockedField label="Register Number" value={form.regNo || "Set during seeding"} />
                <div>
                  <label className="ftl-label">Phone Number</label>
                  <input type="tel" className="ftl-input" value={form.phone}
                    onChange={set("phone")} placeholder="+91 98765 43210" maxLength={15} required />
                </div>
              </div>

              {/* ROW: Academic Year (batch) + Year of Study */}
              <div className="ftl-grid-2">
                {profile.academicYear && ACADEMIC_YEARS.includes(profile.academicYear) ? (
                  <LockedField label="Academic Year (Batch)" value={form.academicYear} />
                ) : (
                  <div>
                    <label className="ftl-label">Academic Year (Batch)</label>
                    <select className="ftl-select" value={form.academicYear}
                      onChange={set("academicYear")} required>
                      <option value="">Select batch year</option>
                      {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="ftl-label">Year of Study</label>
                  <select className="ftl-select" value={form.yearOfStudy}
                    onChange={set("yearOfStudy")} required>
                    <option value="">Select year</option>
                    {YEARS_OF_STUDY.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              {/* Department - full width */}
              <div className="ftl-col-full">
                {profile.department ? (
                  <LockedField label="Department" value={
                    DEPARTMENTS.find(d => d.value === form.department)?.label || form.department
                  } />
                ) : (
                  <div>
                    <label className="ftl-label">Department</label>
                    <select className="ftl-select" value={form.department}
                      onChange={set("department")} required>
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── TEACHER / DEPT ADMIN FIELDS ── */}
          {(isTeacher || isDeptAd) && (
            <>
              <div className="ftl-grid-2">
                {isTeacher && <LockedField label="Faculty / College ID" value={form.collegeId || "Set by Admin"} />}
                <div>
                  <label className="ftl-label">Phone Number</label>
                  <input type="tel" className="ftl-input" value={form.phone}
                    onChange={set("phone")} placeholder="+91 98765 43210" maxLength={15} />
                </div>
              </div>

              <div className="ftl-col-full">
                <div>
                  <label className="ftl-label">Assigned Department <EditTag /></label>
                  <select className="ftl-select" value={form.department}
                    onChange={set("department")} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && <div className="ftl-col-full ftl-error">{error}</div>}

          {/* Actions */}
          <div className="ftl-col-full ftl-actions">
            <button type="submit" disabled={loading} className="ftl-submit-btn">
              {loading ? "Saving…" : "Confirm & Access Dashboard"}
            </button>
            <button type="button" onClick={logout} className="ftl-signout-btn">
              Sign out
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
