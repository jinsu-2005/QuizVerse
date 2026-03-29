import re
import os

filepath = r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# Replace SidebarLayout mobile navigation to include hamburger menu.
sidebar_layout_old = r"""      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 safe-bottom">
         <div className="flex justify-around p-2">
            {\[
              \{ key: "home", icon: "🏠", label: "Home" \},
              \{ key: "quizzes", icon: "📚", label: "Quizzes" \},
              \{ key: "create", icon: "✨", label: "Create" \},
              \{ key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 \? requestsCount : null \},
              \{ key: "analytics", icon: "📈", label: "Data" \},
            \]\.map\(tab => \([\s\S]*?\)
         </div>
      </nav>
    </div>
  \);
\}"""

sidebar_layout_new = """      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 safe-bottom">
         <div className="flex justify-around p-1.5 px-3">
            {[
              { key: "home", icon: "🏠", label: "Home" },
              { key: "quizzes", icon: "📚", label: "Quizzes" },
              { key: "create", icon: "✨", label: "Create Quiz", main: true },
              { key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 ? requestsCount : null },
              { key: "more", icon: "☰", label: "Menu" },
            ].map(tab => (
              <button 
                key={tab.key} 
                onClick={() => tab.key === "more" ? onOpenProfile() : onTabSelect(tab.key)} 
                className={`relative flex flex-col items-center justify-center transition-colors ${tab.main ? '-mt-6 bg-indigo-600 rounded-full w-14 h-14 border-4 border-gray-950 text-white shadow-lg shadow-indigo-600/30' : 'p-2 rounded-xl ' + (activeTab === tab.key ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}`}
              >
                 <span className={tab.main ? "text-2xl" : "text-xl mb-0.5"}>{tab.icon}</span>
                 {!tab.main && <span className="text-[10px] font-bold">{tab.label}</span>}
                 {tab.badge && <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-gray-900"></span>}
              </button>
            ))}
         </div>
      </nav>
    </div>
  );
}"""

if "mobile Bottom Nav" in code: # Just to be safe not to crash
    code = code.replace(re.search(sidebar_layout_old, code).group(0), sidebar_layout_new)

# Replace CreateQuizSection completely.
create_quiz_old_regex = r"function CreateQuizSection\(\{[\s\S]*?\}\) \{\n[\s\S]*?(?=function QuestionCard)"
# Find the exact match
match = re.search(create_quiz_old_regex, code)
if not match:
    print("Could not find CreateQuizSection")
else:
    create_quiz_new = """function CreateQuizSection({
  saveStatus,
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, saveQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode,
  timeValue, setTimeValue, maxAttempts, setMaxAttempts,
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt,
  generateMode, setGenerateMode, editingId, cancelEdit
}) {

  const [currentQIndex, setCurrentQIndex] = useState(0);

  // Auto-correct index if questions are removed
  useEffect(() => {
    if (currentQIndex >= questions.length && questions.length > 0) {
      setCurrentQIndex(questions.length - 1);
    }
  }, [questions.length, currentQIndex]);

  const toggleMode = (mode) => {
    if (editingId && mode === "ai") {
      alert("You are currently editing an existing quiz. Please save or cancel before using the AI Generator.");
      return;
    }
    setGenerateMode(mode);
  };

  const activeQ = questions[currentQIndex] || { question: "", options: ["","","",""], answerIndex: 0, explanation: "" };

  const isCurrentValid = () => {
    if (!activeQ.question.trim()) return false;
    if (activeQ.options.some(o => !o.trim())) return false;
    return true;
  };

  const isPublishReady = () => {
    return questions.every(q => q.question.trim() && !q.options.some(o => !o.trim())) && form.title.trim() && form.department && form.academicYear;
  };

  const handleNext = () => {
    if (!isCurrentValid()) return;
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      addQuestion();
      setCurrentQIndex(questions.length);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
  };

  const handleRemove = () => {
    removeQuestion(currentQIndex);
    if (currentQIndex > 0) setCurrentQIndex(currentQIndex - 1);
  };

  const pct = Math.round(((currentQIndex + 1) / questions.length) * 100);

  return (
    <Section title={editingId ? "Edit Quiz" : "Create Quiz"}>
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 backdrop-blur-2xl p-4 sm:p-6 transition-all duration-300">
        {saveStatus && <div className="absolute top-4 right-4 py-1 px-3 text-xs font-bold text-green-400 bg-green-900/20 border border-green-800/30 rounded-full animate-[fadeIn_0.3s_ease] z-20">{saveStatus}</div>}
        
        {/* Toggle Mode */}
        {!editingId && (
          <div className="relative z-10 flex p-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl w-full mb-6">
            {["ai", "manual"].map((m) => (
              <button
                key={m}
                onClick={() => toggleMode(m)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${generateMode === m
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                  }`}
              >
                {m === "ai" ? "AI Generate" : "Manual Create"}
              </button>
            ))}
          </div>
        )}

        {/* Global Quiz Meta */}
        <div className="relative z-10 grid gap-6 mb-8">
          <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="e.g., Basics of C Programming" />
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })}
              options={[{ value: "IT", text: "IT" }, { value: "CSE", text: "CSE" }, { value: "ECE", text: "ECE" }, { value: "EEE", text: "EEE" }, { value: "MECH", text: "MECH" }, { value: "CIVIL", text: "CIVIL" }]} />
            <Select label="Academic Year" value={form.academicYear} onChange={(v) => setForm({ ...form, academicYear: v })}
              options={["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"].map((y) => ({ value: y, text: y }))} />
          </div>
        </div>

        <hr className="border-gray-800/80 my-2" />

        {/* AI Generator */}
        {generateMode === "ai" && (
           <form onSubmit={generateWithAI} className="relative z-10 flex flex-col gap-6 mt-6">
              <div className="flex bg-gray-900/80 border border-gray-700/60 p-1.5 rounded-2xl">
                {["topic", "file"].map((m) => (
                  <button key={m} type="button" onClick={() => setAiMode(m)} className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${aiMode === m ? "bg-indigo-600/30 border border-indigo-500 test-indigo-300" : "text-gray-400"}`}>
                    {m === "topic" ? "From Topic" : "From File"}
                  </button>
                ))}
              </div>
              {aiMode === "topic" ? <Field label="Topic" value={topic} onChange={setTopic} placeholder="Data Structures" /> : <div className="space-y-4">
                 <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv" onChange={onPickFile} />
                 <div onClick={() => fileRef.current?.click()} className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/40 p-6 text-center text-sm font-bold text-gray-300">{file ? file.name : "Upload .txt / .csv"}</div>
                 <Field label="Instruction" value={instruction} onChange={setInstruction} placeholder="Create 10 questions..." />
              </div>}
              
              <div className="grid grid-cols-2 gap-4">
                 <NumberField label="Questions" value={numQuestions} onChange={v=>setNumQuestions(v)} onBlur={() => setNumQuestions(clampedNumQ(numQuestions))} min={1} max={100} />
                 <NumberField label="Options" value={numOptions} onChange={v=>setNumOptions(v)} onBlur={() => setNumOptions(clampedNumOpt(numOptions))} min={2} max={10} />
              </div>
              <button type="submit" disabled={aiLoading} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg text-white py-3.5 font-bold">{aiLoading ? "Generating..." : "Generate AI Quiz"}</button>
           </form>
        )}

        {/* Paginated Question Wizard */}
        {generateMode === "manual" && questions.length > 0 && (
          <div className="relative z-10 flex flex-col gap-5 mt-6 pb-24 sm:pb-0 animate-[fadeIn_0.3s_ease]">
            {/* Progress Header */}
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-end">
                <div className="text-xl font-bold text-indigo-400">Question {currentQIndex + 1} <span className="text-gray-500 text-sm">/ {questions.length}</span></div>
                <div className="flex gap-2">
                  <button disabled={questions.length <= 1} onClick={handleRemove} className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold disabled:opacity-30 transition-all">Remove</button>
                </div>
              </div>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Editing Canvas */}
            <div className="p-5 border border-gray-700/80 bg-gray-800/50 rounded-2xl space-y-5">
              <textarea
                value={activeQ.question}
                onChange={(e) => updateQuestion(currentQIndex, { question: e.target.value })}
                placeholder="Type your question..."
                rows={3}
                className="w-full rounded-xl border border-gray-700/80 bg-gray-900/80 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:bg-gray-900"
              />
              <div className="grid sm:grid-cols-2 gap-3">
                {activeQ.options.map((opt, oi) => (
                  <div key={oi} className="relative group flex items-center gap-3 w-full rounded-xl border border-gray-700/80 bg-gray-900/60 px-4 py-2 transition-all focus-within:border-indigo-500 hover:bg-gray-800/60">
                    <input
                      type="radio" name={`correct_${currentQIndex}`}
                      checked={activeQ.answerIndex === oi}
                      onChange={() => updateQuestion(currentQIndex, { answerIndex: oi })}
                      className="w-5 h-5 accent-indigo-500 cursor-pointer"
                    />
                    <input
                      value={opt}
                      onChange={(e) => updateOption(currentQIndex, oi, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                      className="flex-1 bg-transparent text-sm outline-none text-gray-100 placeholder:text-gray-600"
                    />
                  </div>
                ))}
              </div>
              <textarea
                value={activeQ.explanation}
                onChange={(e) => updateQuestion(currentQIndex, { explanation: e.target.value })}
                placeholder="Explanation (Optional)"
                rows={1}
                className="w-full rounded-xl border border-gray-700/80 bg-gray-900/80 px-4 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-600"
              />
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex justify-between items-center mt-4">
              <button disabled={currentQIndex === 0} onClick={handlePrev} className="px-6 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold disabled:opacity-30 transition-all">Previous</button>
              
              <div className="flex gap-4 items-center">
                 {!isPublishReady() ? (
                    <span className="text-amber-500 text-xs font-bold px-4 py-2 bg-amber-500/10 rounded-lg">Fill all required fields to publish</span>
                 ) : (
                    <button onClick={() => saveQuiz("published")} disabled={busyCreate} className="px-8 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/30 transition-all">
                       {busyCreate ? "Saving..." : (editingId ? "Update Live" : "Publish Quiz")}
                    </button>
                 )}
                 <button disabled={!isCurrentValid()} onClick={handleNext} className="px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-30 disabled:bg-gray-700 transition-all shadow-lg">
                   {currentQIndex === questions.length - 1 ? "+ Add New Question" : "Next Question"}
                 </button>
              </div>
            </div>

            {/* Mobile Swipe / Paginated Bottom Action Bar */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800 flex justify-between gap-3 safe-bottom">
               <button disabled={currentQIndex === 0} onClick={handlePrev} className="w-[80px] rounded-xl bg-gray-800 text-gray-300 font-bold text-sm py-3 disabled:opacity-30"><span className="text-xl">←</span></button>
               {isPublishReady() && currentQIndex === questions.length - 1 ? (
                  <button onClick={() => saveQuiz("published")} disabled={busyCreate} className="flex-1 rounded-xl bg-green-600 text-white font-bold text-sm shadow-lg py-3">Publish</button>
               ) : (
                  <button disabled={!isCurrentValid()} onClick={handleNext} className="flex-1 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-lg disabled:opacity-30 disabled:bg-gray-700 py-3">{currentQIndex === questions.length - 1 ? "+ Add Q" : "Next →"}</button>
               )}
            </div>
            
          </div>
        )}
      </div>
    </Section>
  );
}

"""
    code = code.replace(match.group(0), "\n" + create_quiz_new)

# Remove QuestionCard since we deleted it from CreateQuizSection
qc_regex = r"function QuestionCard\(\{[\s\S]*?\}\) \{\n[\s\S]*?\n\}"
code = re.sub(qc_regex, "", code)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("done phase 2 wizard refactor.")
