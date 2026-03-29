import React, { useEffect, useState, useRef } from "react";
import { db } from "../../../firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Section, Field, Select, NumberField, Empty, Badge } from "./UI.jsx";
import { MIN_Q, MAX_Q, MIN_OPT, MAX_OPT } from "./Utils.js";

export function CreateQuizSection({
  saveStatus,
  form, setForm, questions, setQuestions, addQuestion, removeQuestion,
  updateQuestion, updateOption, saveQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode,
  timeValue, setTimeValue, maxAttempts, setMaxAttempts,
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt,
  generateMode, setGenerateMode, editingId, cancelEdit, fbUser
}) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [showQB, setShowQB] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadBank, setLoadBank] = useState(false);

  useEffect(() => {
    if (!showQB || !fbUser?.uid || bankQuestions.length > 0) return;
    const fetchBank = async () => {
      setLoadBank(true);
      try {
        const snap = await getDocs(query(collection(db, "questionBank"), where("teacherId", "==", fbUser.uid), limit(50)));
        setBankQuestions(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch(e) { console.error(e); }
      setLoadBank(false);
    };
    fetchBank();
  }, [showQB, fbUser]);

  const handleImportBank = (bq) => {
    const newQuestions = [...questions];
    if (newQuestions[currentQIndex] && !newQuestions[currentQIndex].question.trim() && newQuestions[currentQIndex].options.every(o => !o.trim())) {
      newQuestions[currentQIndex] = { question: bq.question, options: bq.options, answerIndex: bq.answerIndex, explanation: bq.explanation || "" };
    } else {
      newQuestions.push({ question: bq.question, options: bq.options, answerIndex: bq.answerIndex, explanation: bq.explanation || "" });
      setCurrentQIndex(newQuestions.length - 1);
    }
    setQuestions(newQuestions);
    setShowQB(false);
  };

  const currentQ = questions[currentQIndex] || questions[0];

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) setCurrentQIndex(currentQIndex + 1);
    else addQuestion();
  };
  const handleBack = () => { if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1); };
  const handleRemove = () => {
    if (questions.length <= 1) return;
    removeQuestion(currentQIndex);
    if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
  };

  const isCurrentQValid = (currentQ?.question || "").trim() !== "" && (currentQ?.options || []).every(o => (o || "").trim() !== "");

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <Section title={editingId ? "Edit Teaching Module" : "Create New Module"}>
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] p-6 md:p-10 shadow-sm flex flex-col gap-10 transition-colors">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {!editingId && (
              <div className="flex p-1.5 bg-[var(--bg-subtle)] rounded-2xl w-full md:w-auto border border-[var(--border-main)]">
                {["ai", "manual"].map((m) => (
                  <button
                    key={m} onClick={() => setGenerateMode(m)}
                    className={`flex-1 min-w-[140px] py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${generateMode === m ? "bg-[var(--bg-card)] text-indigo-600 shadow-md border border-[var(--border-main)] font-black" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"}`}
                  >
                    {m === "ai" ? "AI Generation" : "Manual Entry"}
                  </button>
                ))}
              </div>
            )}
            {saveStatus && <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-4 py-2 rounded-full shadow-sm">{saveStatus}</div>}
          </div>

          {/* Module Settings Accordion */}
          <div className="bg-[var(--bg-subtle)]/50 rounded-2xl border border-[var(--border-main)] overflow-hidden transition-colors">
             <details open={!editingId} className="group">
                <summary className="p-5 flex items-center justify-between cursor-pointer list-none select-none hover:bg-[var(--bg-subtle)] transition-colors">
                   <div className="flex items-center gap-3">
                      <span className="text-xl">⚙️</span>
                      <span className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">Standard Module Configuration</span>
                   </div>
                   <span className="text-[var(--text-dim)] group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="p-6 md:p-8 pt-2 grid gap-8 border-t border-[var(--border-main)] bg-[var(--bg-card)] transition-colors">
                   <div className="grid md:grid-cols-2 gap-6">
                      <Field label="System Title" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="e.g., Introduction to Programming" />
                      <Field label="Short Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Provide context for students..." />
                   </div>
                   <div className="grid md:grid-cols-3 gap-6">
                      <Select label="Instructor Department" value={form.department} onChange={v => setForm({ ...form, department: v })} options={[ {label:"IT",value:"IT"}, {label:"CSE",value:"CSE"}, {label:"ECE",value:"ECE"}, {label:"EEE",value:"EEE"}, {label:"MECH",value:"MECH"}, {label:"CIVIL",value:"CIVIL"}, {label:"AIDS",value:"AIDS"}, {label:"AIML",value:"AIML"} ]} renderOption={o=>o.label} />
                      <Select label="Target Academic Cycle" value={form.academicYear} onChange={v => setForm({ ...form, academicYear: v })} options={["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"].map(y => ({ value: y, text: y }))} />
                      <Select label="Subject Difficulty" value={difficulty} onChange={setDifficulty} options={["Easy", "Moderate", "Hard"]} />
                   </div>
                   <div className="grid md:grid-cols-3 gap-6 items-end">
                      <NumberField label="Attempt Limitation (0=Unlimit)" value={maxAttempts} onChange={v => setMaxAttempts(v)} min={0} max={5} />
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-[var(--text-dim)] ml-1 uppercase tracking-widest">TIMER PROTOCOL</label>
                         <div className="flex p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-main)] shadow-inner">
                           {["off", "perQuestion", "total"].map(t => (
                             <button key={t} type="button" onClick={() => setTimerMode(t)} className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${timerMode===t ? "bg-[var(--bg-card)] text-indigo-600 shadow-sm border border-[var(--border-main)]" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"}`}>
                                {t === "off" ? "Off" : t === "total" ? "Total" : "Per Q"}
                             </button>
                           ))}
                         </div>
                      </div>
                      {(timerMode !== "off") && <NumberField label={timerMode === "total" ? "MINUTES (TOTAL)" : "SECONDS (PER Q)"} value={timeValue} onChange={v => setTimeValue(v)} min={1} />}
                   </div>
                </div>
             </details>
          </div>

          {/* AI Workflow Control */}
          {generateMode === "ai" && (
             <form onSubmit={generateWithAI} className="flex flex-col gap-10 pt-4 relative group/ai">
                <div className="p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/20 flex flex-col gap-8 transition-colors">
                   <div className="flex bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-main)] shadow-sm max-w-md">
                      {["topic", "file"].map((m) => (
                        <button key={m} type="button" onClick={() => setAiMode(m)} className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${aiMode === m ? "bg-indigo-600 text-white shadow-md" : "text-indigo-400 hover:text-indigo-600"}`}>{m === "topic" ? "From Syllabus Topic" : "From Reference File"}</button>
                      ))}
                   </div>
                   
                   {aiMode === "topic" ? (
                      <Field label="Target Topic / Chapter" value={topic} onChange={setTopic} placeholder="e.g., Fundamental Data Structures or Operating Systems" />
                   ) : (
                      <div className="grid gap-6">
                         <div onClick={() => fileRef.current?.click()} className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[var(--bg-card)] p-12 text-center hover:border-indigo-500 transition-all group">
                            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{file ? "📄" : "☁️"}</div>
                            <div className="text-sm font-bold text-[var(--text-main)]">{file ? file.name : "Click to Upload Teaching Material"}</div>
                            <div className="text-[10px] text-[var(--text-dim)] mt-2 font-semibold uppercase tracking-widest opacity-70">Supports TEXT or CSV (Max 1MB)</div>
                         </div>
                         <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv" onChange={onPickFile} />
                         <Field label="AI Custom Instructions" value={instruction} onChange={setInstruction} placeholder="e.g., Focus on recursive logic and computational complexity." />
                      </div>
                   )}

                   <div className="grid md:grid-cols-2 gap-6">
                      <NumberField label="Total Questions (Max 100)" value={numQuestions} onChange={v=>setNumQuestions(v)} onBlur={() => setNumQuestions(clampedNumQ(numQuestions))} min={1} max={100} />
                      <NumberField label="Choices Per Question (2-10)" value={numOptions} onChange={v=>setNumOptions(v)} onBlur={() => setNumOptions(clampedNumOpt(numOptions))} min={2} max={10} />
                   </div>
                </div>

                <button type="submit" disabled={aiLoading} className="w-full h-16 rounded-2xl bg-indigo-600 hover:bg-slate-900 dark:hover:bg-slate-100 dark:hover:text-slate-900 shadow-xl shadow-indigo-500/10 text-white font-bold text-base uppercase tracking-widest transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4">
                   {aiLoading ? (
                      <>
                        <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Syllabus Analyser...
                      </>
                   ) : "Initialize AI Module Generation"}
                </button>
             </form>
          )}

          {/* Manual Entry Flow */}
          {generateMode === "manual" && (
            <div className="flex flex-col gap-10 pt-4">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-[var(--border-main)] pb-6">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">{currentQIndex + 1}</div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-[var(--text-main)] uppercase tracking-tight">Question Editor</span>
                         <span className="text-[10px] font-semibold text-[var(--text-dim)] uppercase tracking-widest opacity-70">Progress: {currentQIndex + 1} of {questions.length}</span>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <button onClick={() => setShowQB(true)} className="px-5 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] text-xs font-bold uppercase transition-all hover:bg-[var(--bg-card)]">Archives</button>
                      <button disabled={questions.length <= 1} onClick={handleRemove} className="px-5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold uppercase transition-all hover:bg-rose-500/20 disabled:opacity-30">Delete Item</button>
                   </div>
                </div>

                <div className="bg-[var(--bg-subtle)]/50 border border-[var(--border-main)] rounded-[2rem] p-8 md:p-12 flex flex-col gap-8 shadow-inner transition-colors">
                   <Field label="Active Question Text" value={currentQ.question} onChange={v => updateQuestion(currentQIndex, { question: v })} placeholder="As specified in the curriculum..." />
                   
                   <div className="grid md:grid-cols-2 gap-6">
                      {currentQ.options.map((opt, oi) => (
                        <div key={oi} className="group relative">
                           <label className="text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest ml-1 mb-2 block opacity-70">Option {String.fromCharCode(65 + oi)}</label>
                           <div className="flex gap-2">
                              <input
                                value={opt} onChange={e => updateOption(currentQIndex, oi, e.target.value)}
                                className={`flex-1 h-14 rounded-xl border px-6 text-sm font-semibold outline-none transition-all shadow-sm ${currentQ.answerIndex === oi ? "bg-emerald-500/10 border-emerald-500 text-emerald-500 font-bold" : "bg-[var(--bg-card)] border-[var(--border-main)] hover:border-indigo-400 text-[var(--text-main)]"}`}
                                placeholder="Enter value..."
                              />
                              <button 
                                onClick={() => updateQuestion(currentQIndex, { answerIndex: oi })}
                                className={`h-14 w-14 flex items-center justify-center rounded-xl border text-xl transition-all ${currentQ.answerIndex === oi ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20" : "bg-[var(--bg-card)] text-[var(--text-dim)] border-[var(--border-main)] hover:text-emerald-500"}`}
                                title="Mark as Correct Solution"
                              >
                                ✓
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>

                   <Field label="System Explanation (For Student Feedback)" value={currentQ.explanation} onChange={v => updateQuestion(currentQIndex, { explanation: v })} placeholder="Provide context or educational reasoning..." />
                </div>

                {/* Question Navigation */}
                <div className="flex items-center justify-between gap-6 pb-20 md:pb-0">
                   <button onClick={handleBack} disabled={currentQIndex === 0} className="w-16 h-16 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-2xl flex items-center justify-center hover:bg-[var(--bg-subtle)] text-[var(--text-main)] disabled:opacity-30 shadow-sm transition-all group">
                      <span className="group-hover:-translate-x-1 transition-transform">←</span>
                   </button>
                   
                   <div className="flex-1 max-w-md h-1.5 bg-[var(--bg-subtle)] rounded-full flex gap-1 overflow-hidden">
                      {questions.map((_, i) => (
                        <div key={i} className={`flex-1 transition-all ${i === currentQIndex ? "bg-indigo-600" : "bg-[var(--border-main)]"}`} />
                      ))}
                   </div>

                   <button onClick={handleNext} className={`w-16 h-16 rounded-2xl text-2xl flex items-center justify-center transition-all shadow-lg group ${isCurrentQValid ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:scale-105 active:scale-95" : "bg-[var(--bg-subtle)] text-[var(--text-dim)] border border-[var(--border-main)]"}`}>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                   </button>
                </div>

                <div className="hidden lg:flex justify-end gap-4 border-t border-[var(--border-main)] pt-8 mt-4 transition-colors">
                   {editingId && <button onClick={cancelEdit} className="px-8 py-3 rounded-xl font-bold text-[var(--text-dim)] hover:text-[var(--text-main)]">Cancel Override</button>}
                   <button onClick={() => saveQuiz("draft")} className="px-8 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] text-[var(--text-main)] font-bold hover:bg-[var(--bg-card)] transition-all">Save as Draft Record</button>
                   <button onClick={() => saveQuiz("published")} disabled={busyCreate} className="px-10 py-3 rounded-xl bg-indigo-600 hover:bg-slate-900 text-white font-bold shadow-xl shadow-indigo-500/10 transition-all active:scale-95 disabled:bg-[var(--bg-subtle)] disabled:text-[var(--text-dim)]">Publish to System</button>
                </div>
            </div>
          )}
        </div>
      </Section>

      {/* Persistent Mobile Action Bar */}
      {generateMode === "manual" && (
        <div className="lg:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm flex gap-3">
           <button onClick={() => saveQuiz("published")} disabled={busyCreate} className="flex-1 h-14 rounded-2xl bg-indigo-600 shadow-2xl shadow-indigo-500/20 text-white font-bold flex items-center justify-center gap-3">
             <span>🚀</span> {editingId ? "Update Record" : "Publish Module"}
           </button>
        </div>
      )}

      {/* Archives / Question Bank Drawer */}
      {showQB && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowQB(false)} />
          <div className="relative w-full max-w-lg bg-[var(--bg-card)] h-full border-l border-[var(--border-main)] shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right duration-400">
             <div className="p-8 border-b border-[var(--border-main)] flex justify-between items-center bg-[var(--bg-subtle)]/50">
               <div className="flex flex-col">
                  <h3 className="text-xl font-bold text-[var(--text-main)] uppercase tracking-tight">Question Archives</h3>
                  <span className="text-xs font-semibold text-[var(--text-dim)] opacity-70">Select previously validated items</span>
               </div>
               <button onClick={() => setShowQB(false)} className="h-10 w-10 flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl text-[var(--text-dim)] hover:text-[var(--text-main)]">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto p-8 space-y-6">
               {loadBank ? (
                  <div className="py-20 text-center flex flex-col items-center gap-4">
                     <div className="w-10 h-10 border-4 border-indigo-100/30 border-t-indigo-600 rounded-full animate-spin" />
                     <span className="text-sm font-bold text-[var(--text-dim)] uppercase tracking-widest">Accessing Archives...</span>
                  </div>
               ) : bankQuestions.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-[var(--border-main)] bg-[var(--bg-subtle)]/30 p-16 text-center">
                     <div className="text-5xl mb-6 grayscale opacity-20">📦</div>
                     <p className="text-[var(--text-dim)] text-sm font-bold leading-relaxed">No validated questions found in your personal repository yet.</p>
                  </div>
               ) : (
                  bankQuestions.map(bq => (
                     <div key={bq.id} className="p-6 rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] hover:border-indigo-500 hover:shadow-lg transition-all flex flex-col gap-6 group">
                        <div className="text-sm font-bold text-[var(--text-main)] leading-relaxed italic pr-4">{bq.question}</div>
                        <div className="flex justify-between items-center pt-4 border-t border-[var(--border-main)]">
                           <Badge variant="indigo">{bq.department || "General"}</Badge>
                           <button onClick={() => handleImportBank(bq)} className="px-6 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">Insert to Editor</button>
                        </div>
                     </div>
                  ))
               )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
