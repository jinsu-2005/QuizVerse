import React, { useEffect, useState } from "react";
import { updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "../../../firebase";
import { Field, Select } from "./UI.jsx";

async function compressToDataURL(file) {
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
    } catch (error) {
      console.error(error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressToDataURL(file);
    setForm({ ...form, photoURL: dataUrl });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-[var(--bg-overlay)] backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[var(--bg-card-solid)] h-full border-l border-[var(--border-main)] shadow-2xl overflow-y-auto flex flex-col transform animate-in slide-in-from-right duration-400 text-[var(--text-main)] transition-colors">
        <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-subtle)]/80 transition-colors">
          <div className="flex flex-col">
            <h3 className="text-xl font-bold text-[var(--text-main)] uppercase">Account Settings</h3>
            <span className="text-xs font-semibold text-[var(--text-dim)]">Manage your credentials and records</span>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-dim)] hover:text-[var(--text-main)] hover:border-[var(--border-strong)] transition-all font-bold"
          >
            X
          </button>
        </div>

        <div className="flex-1 p-8 space-y-10">
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="relative group p-2 rounded-full border border-[var(--border-main)] bg-[var(--bg-subtle)] transition-colors">
              <img
                src={form.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(form.name || "T")}&background=4f46e5&color=fff`}
                className="h-32 w-32 rounded-full object-cover border-4 border-white shadow-lg group-hover:scale-105 transition-all duration-500"
                alt=""
              />
              <label className="absolute inset-2 flex items-center justify-center bg-[var(--bg-overlay)] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full p-4 text-center">
                <span className="text-[10px] font-bold tracking-widest uppercase text-white leading-tight">Update Photo</span>
                <input type="file" className="hidden" accept="image/*" onChange={onFile} />
              </label>
            </div>

            <div className="text-center">
              <div className="text-xl font-bold text-[var(--text-main)]">{form.name || "Instructor Name"}</div>
              <Badge variant="indigo">Verified Faculty</Badge>
            </div>
          </div>

          <div className="grid gap-8 p-1">
            <Field label="Full Legal Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} placeholder="As per official documents" />
            <Field label="Associated Institution" value={form.institute} onChange={(value) => setForm({ ...form, institute: value })} placeholder="University or School name" />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Primary Department" value={form.department} onChange={(value) => setForm({ ...form, department: value })} options={["FY", "IT", "CSE", "ECE", "EEE", "MECH", "CIVIL", "AIDS", "AIML"].map((department) => ({ value: department, text: department }))} />
              <Select label="Gender Information" value={form.gender} onChange={(value) => setForm({ ...form, gender: value })} options={["Male", "Female", "Other"].map((gender) => ({ value: gender, text: gender }))} />
            </div>
            <Field label="Registered Date of Birth" value={form.dob} onChange={(value) => setForm({ ...form, dob: value })} type="date" />
          </div>
        </div>

        <div className="p-8 border-t border-[var(--border-main)] bg-[var(--bg-subtle)]/80 flex gap-4 transition-colors">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border-2 border-[var(--border-main)] bg-[var(--bg-card)] text-[var(--text-dim)] font-bold uppercase text-xs tracking-widest hover:bg-[var(--bg-subtle)] transition-all transition-colors">Discard</button>
          <button onClick={save} disabled={saving} className="flex-2 h-12 rounded-xl bg-indigo-600 hover:opacity-95 text-white font-bold uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:bg-[var(--bg-muted)] disabled:text-[var(--text-dim)] px-8">
            {saving ? "Updating..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Badge({ children, variant = "indigo" }) {
  const variants = {
    indigo: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  };

  return (
    <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${variants[variant]} mt-2`}>
      {children}
    </span>
  );
}
