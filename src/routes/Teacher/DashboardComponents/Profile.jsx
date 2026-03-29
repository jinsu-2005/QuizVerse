import React, { useState, useEffect } from "react";
import { updateProfile } from "firebase/auth";
import { db, auth } from "../../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { Field, Select } from "./UI.jsx";

async function compressToDataURL(file, options) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function TeacherProfileDrawer({ open, onClose, initial }) {
  const [form, setForm] = useState(initial || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial || {});
  }, [open, initial]);

  const save = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      const { uid } = auth.currentUser;
      const clean = { ...form };
      delete clean.uid;
      
      await setDoc(doc(db, "users", uid), { ...clean, updatedAt: new Date() }, { merge: true });
      if (clean.displayName || clean.photoURL) {
        await updateProfile(auth.currentUser, {
          displayName: clean.name || clean.displayName,
          photoURL: clean.photoURL,
        });
      }
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dataUrl = await compressToDataURL(f);
    setForm({ ...form, photoURL: dataUrl });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white h-full border-l border-slate-200 shadow-2xl overflow-y-auto flex flex-col transform animate-in slide-in-from-right duration-400">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
           <div className="flex flex-col">
              <h3 className="text-xl font-bold text-slate-900 uppercase">Account Settings</h3>
              <span className="text-xs font-semibold text-slate-400">Manage your credentials and records</span>
           </div>
           <button onClick={onClose} className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all font-bold">✕</button>
        </div>

        <div className="flex-1 p-8 space-y-10">
           {/* Profile Picture Area */}
           <div className="flex flex-col items-center gap-6 py-4">
              <div className="relative group p-2 rounded-full border border-slate-200 bg-slate-50">
                <img src={form.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "T")}&background=4f46e5&color=fff`} className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-all duration-500" alt="" />
                <label className="absolute inset-2 flex items-center justify-center bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full p-4 text-center">
                   <span className="text-[10px] font-bold tracking-widest uppercase text-white leading-tight">Update Photo</span>
                   <input type="file" className="hidden" accept="image/*" onChange={onFile} />
                </label>
              </div>
              <div className="text-center">
                 <div className="text-xl font-bold text-slate-900">{form.name || "Instructor Name"}</div>
                 <Badge variant="indigo">Verified Faculty</Badge>
              </div>
           </div>

           <div className="grid gap-8 p-1">
              <Field label="Full Legal Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="As per official documents" />
              <Field label="Associated Institution" value={form.institute} onChange={v => setForm({ ...form, institute: v })} placeholder="University or School name" />
              <div className="grid grid-cols-2 gap-4">
                <Select label="Primary Department" value={form.department} onChange={v => setForm({ ...form, department: v })} options={["IT", "CSE", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML"].map(d => ({ value: d, text: d }))} />
                <Select label="Gender Information" value={form.gender} onChange={v => setForm({ ...form, gender: v })} options={["Male", "Female", "Other"].map(g => ({ value: g, text: g }))} />
              </div>
              <Field label="Registered Date of Birth" value={form.dob} onChange={v => setForm({ ...form, dob: v })} type="date" />
           </div>
        </div>

        <div className="p-8 border-t border-slate-100 bg-slate-50 flex gap-4">
           <button onClick={onClose} className="flex-1 h-12 rounded-xl border-2 border-slate-200 bg-white text-slate-500 font-bold uppercase text-xs tracking-widest hover:bg-slate-100 transition-all transition-colors">Discard</button>
           <button onClick={save} disabled={saving} className="flex-2 h-12 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-300 px-8">
              {saving ? "Updating..." : "Save Configuration"}
           </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant = "indigo" }) {
  const variants = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${variants[variant]} mt-2`}>
      {children}
    </span>
  );
}
