import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext.jsx";
import { db } from "../../firebase.js";

const INSTITUTES = ["Ponjesly College of Engineering"];
const ACADEMIC_YEARS = ["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"];
const DEPARTMENTS = [
  { label: "First Year - Foundation (FY)", value: "FY" },
  { label: "Information Technology (IT)", value: "IT" },
  { label: "Computer Science and Engineering (CSE)", value: "CSE" },
  { label: "Electronics and Communication Engineering (ECE)", value: "ECE" },
  { label: "Electrical and Electronics Engineering (EEE)", value: "EEE" },
  { label: "Mechanical Engineering (MECH)", value: "MECH" },
  { label: "Civil Engineering (CIVIL)", value: "CIVIL" },
  { label: "Artificial Intelligence and Data Science (AIDS)", value: "AIDS" },
  { label: "Artificial Intelligence and Machine Learning (AIML)", value: "AIML" },
];
const TEACHER_VERIFICATION_PHRASE = "i am a teacher";

export default function RoleGate() {
  const { fbUser } = useAuth();
  const nav = useNavigate();

  const [role, setRole] = useState("");
  const [form, setForm] = useState({
    name: "",
    dob: "",
    gender: "",
    institute: INSTITUTES[0],
    regNo: "",
    academicYear: "",
    department: "",
    defaultPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ type: "", msg: "" });

  useEffect(() => {
    if (!toast.msg) return;
    const timeout = setTimeout(() => setToast({ type: "", msg: "" }), 2800);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    (async () => {
      if (!fbUser) return;
      const ref = doc(db, "users", fbUser.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        if (data.role) {
          const isAd = ["super_admin", "inst_admin", "dept_admin"].includes(data.role);
          nav(isAd ? "/admin" : (data.role === "teacher" ? "/teacher" : "/student"), { replace: true });
          return;
        }
      }

      setForm((current) => ({
        ...current,
        name: current.name || fbUser.displayName || (fbUser.email?.split("@")[0] ?? ""),
      }));
    })();
  }, [fbUser, nav]);

  const canSave = useMemo(() => {
    if (!role) return false;

    const baseOk =
      form.name.trim() &&
      form.gender.trim() &&
      form.dob.trim() &&
      form.institute.trim();

    if (!baseOk) return false;

    if (role === "student") {
      return form.regNo.trim() && form.academicYear.trim() && form.department.trim();
    }

    return form.defaultPassword.trim().toLowerCase() === TEACHER_VERIFICATION_PHRASE;
  }, [role, form]);

  const saveProfile = async () => {
    if (!fbUser || !role) return;
    if (!canSave) {
      setToast({ type: "error", msg: "Please complete all required fields." });
      return;
    }

    setLoading(true);
    try {
      const base = {
        email: fbUser.email || null,
        name: form.name || fbUser.displayName || fbUser.email?.split("@")[0],
        dob: form.dob || null,
        gender: form.gender || null,
        institute: form.institute || INSTITUTES[0],
        role,
      };

      const extra = role === "student"
        ? {
            regNo: form.regNo,
            academicYear: form.academicYear,
            department: form.department,
            defaultPassword: null,
          }
        : {
            defaultPassword: TEACHER_VERIFICATION_PHRASE,
            regNo: null,
            academicYear: null,
            department: form.department || null,
          };

      await setDoc(doc(db, "users", fbUser.uid), { ...base, ...extra }, { merge: true });
      setToast({ type: "success", msg: "Profile saved successfully." });
      const isAd = ["super_admin", "inst_admin", "dept_admin"].includes(role);
      nav(isAd ? "/admin" : (role === "teacher" ? "/teacher" : "/student"), { replace: true });
    } catch (error) {
      setToast({ type: "error", msg: formatErr(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 grid place-items-center p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl shadow-[0_0_40px_-10px_rgba(37,99,235,0.4)] transition-all duration-500 hover:shadow-[0_0_60px_-10px_rgba(37,99,235,0.6)]">
        <div className="pointer-events-none absolute -top-28 -left-28 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -right-28 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

        <div className="relative flex flex-col gap-4 border-b border-gray-800 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-8">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 font-extrabold text-xl text-white">
              Q
            </div>
            <div>
              <h1 className="text-[32px] sm:text-[40px] font-extrabold text-white leading-tight">
                QuizVerse
              </h1>
              <p className="mt-1 text-[15px] sm:text-[17px] text-gray-300">
                Complete your profile to continue
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-gray-800 p-1 text-[16px] sm:text-[17px]">
            <button
              onClick={() => setRole("student")}
              className={`px-5 py-2.5 font-semibold rounded-md transition-all ${
                role === "student" ? "bg-blue-600 text-white scale-105" : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
            >
              Student
            </button>
            <button
              onClick={() => setRole("teacher")}
              className={`px-5 py-2.5 font-semibold rounded-md transition-all ${
                role === "teacher" ? "bg-blue-600 text-white scale-105" : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
            >
              Teacher
            </button>
          </div>
        </div>

        <div className="relative px-6 py-8 sm:px-10 text-white">
          {!role ? (
            <p className="text-[18px] text-gray-300 leading-relaxed">
              Select your role to proceed. You can update your details later in your profile.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <InputField label="Full Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
                <DateField label="Date of Birth" value={form.dob} onChange={(value) => setForm({ ...form, dob: value })} />
                <SelectField label="Gender" options={["Male", "Female", "Other", "Prefer not to say"]} value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} />
                <SelectField label="Institute" options={INSTITUTES} value={form.institute} onChange={(value) => setForm({ ...form, institute: value })} />
              </div>

              {role === "student" ? (
                <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <InputField label="Register Number" placeholder="e.g., 961823205032" value={form.regNo} onChange={(value) => setForm({ ...form, regNo: value })} />
                  <SelectField label="Academic Year" options={ACADEMIC_YEARS} value={form.academicYear} onChange={(value) => setForm({ ...form, academicYear: value })} />
                  <SelectFieldObject label="Department" options={DEPARTMENTS} value={form.department} onChange={(value) => setForm({ ...form, department: value })} className="md:col-span-2" />
                </div>
              ) : (
                <div className="mt-8">
                  <SelectFieldObject label="Department" options={DEPARTMENTS} value={form.department} onChange={(value) => setForm({ ...form, department: value })} className="md:col-span-2" />
                  <InputField label="Teacher Verification" placeholder='Type exactly: "i am a teacher"' value={form.defaultPassword} onChange={(value) => setForm({ ...form, defaultPassword: value })} />
                  <p className="mt-2 text-sm text-gray-400">Verification phrase is case-insensitive.</p>
                </div>
              )}

              <div className="mt-10 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => nav("/", { replace: true })}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-5 py-2.5 text-[15px] font-medium text-gray-200 hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canSave || loading}
                  onClick={saveProfile}
                  className={`rounded-lg px-6 py-2.5 text-[15px] font-semibold transition-all ${
                    !canSave || loading
                      ? "bg-gray-600 text-gray-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-700/30"
                  }`}
                >
                  {loading ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {toast.msg && (
        <div className={`fixed top-6 right-4 rounded-lg px-4 py-3 text-sm shadow-lg ${toast.type === "error" ? "bg-red-600" : "bg-green-600"} text-white`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="mb-2 text-[13px] font-medium text-gray-300 tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 text-[15px] outline-none transition-all focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function DateField({ label, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="mb-2 text-[13px] font-medium text-gray-300 tracking-wide">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 text-[15px] outline-none transition-all focus:ring-2 focus:ring-blue-500 [color-scheme:dark]"
      />
    </div>
  );
}

function SelectField({ label, options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="mb-2 text-[13px] font-medium text-gray-300 tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="appearance-none rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 pr-12 text-[15px] outline-none transition-all focus:ring-2 focus:ring-blue-500 w-full"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function SelectFieldObject({ label, options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className="mb-2 text-[13px] font-medium text-gray-300 tracking-wide">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="appearance-none rounded-xl border border-gray-700 bg-gray-800/90 px-4 py-3 pr-12 text-[15px] outline-none transition-all focus:ring-2 focus:ring-blue-500 w-full"
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-70">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M7 10l5 5 5-5" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function formatErr(error) {
  const message = (error?.message || "").replace(/^Firebase:\s*/i, "").replace(/\(.*\)$/, "").trim();
  return message || "Something went wrong. Please try again.";
}
