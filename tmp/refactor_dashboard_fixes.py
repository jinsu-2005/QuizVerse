import re

filepath = r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update Autosave "confirm" to a non-intrusive UI block.
# Actually, the user asked to not show the prompt if they don't have a draft, meaning it saves an empty draft on visit.
# Let's just fix the saving block to only save if not empty.
autosave_save_old = r"""       const draft = \{ form, questions, difficulty, timerMode, timeValue, maxAttempts, sourceMode \};
       localStorage\.setItem\("quizVerseDraft", JSON\.stringify\(draft\)\);
       setSaveStatus\("Draft Saved ✓"\);
       setTimeout\(\(\) => setSaveStatus\(""\), 2000\);"""

autosave_save_new = """       
       const isBlank = !form.title.trim() && questions.length === 1 && !questions[0].question.trim();
       if (!isBlank) {
         const draft = { form, questions, difficulty, timerMode, timeValue, maxAttempts, sourceMode };
         localStorage.setItem("quizVerseDraft", JSON.stringify(draft));
         setSaveStatus("Draft Saved ✓");
         setTimeout(() => setSaveStatus(""), 2000);
       } else {
         localStorage.removeItem("quizVerseDraft");
       }"""
code = re.sub(autosave_save_old, autosave_save_new, code)

# 2. Fix the loading confirmation popup to auto-load OR just use a nice UI.
# Let's just auto-load it if it's there and valid, otherwise ignore it quietly.
autosave_load_old = r"""  // Load draft on mount
  useEffect\(\(\) => \{
    const saved = localStorage\.getItem\("quizVerseDraft"\);
    if \(saved\) \{
      try \{
        const parsed = JSON\.parse\(saved\);
        if \(window\.confirm\("You have an unsaved draft\. Do you want to restore it\?"\)\) \{
           setForm\(parsed\.form \|\| form\);
           setQuestions\(parsed\.questions \|\| questions\);
           setDifficulty\(parsed\.difficulty \|\| "Moderate"\);
           setTimerMode\(parsed\.timerMode \|\| "off"\);
           setTimeValue\(parsed\.timeValue \|\| 30\);
           setMaxAttempts\(parsed\.maxAttempts \|\| 0\);
           setSourceMode\(parsed\.sourceMode \|\| "custom"\);
           setGenerateMode\("manual"\);
        \} else \{
           localStorage\.removeItem\("quizVerseDraft"\);
        \}
      \} catch \(e\) \{\}
    \}
  \}, \[\]\);"""

autosave_load_new = """  // Auto-restore draft on mount if valid
  useEffect(() => {
    const saved = localStorage.getItem("quizVerseDraft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setForm(parsed.form || form);
        setQuestions(parsed.questions || questions);
        setDifficulty(parsed.difficulty || "Moderate");
        setTimerMode(parsed.timerMode || "off");
        setTimeValue(parsed.timeValue || 30);
        setMaxAttempts(parsed.maxAttempts || 0);
        setSourceMode(parsed.sourceMode || "custom");
        setGenerateMode("manual");
      } catch (e) {}
    }
  }, []);"""
if "window.confirm(" in code:
    code = re.sub(autosave_load_old, autosave_load_new, code)

# 3. Rewrite the main return block of TeacherDashboard
# Find everything from `<div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full grid gap-8 lg:grid-cols-[1fr_400px]">` to `{/* Toast */}`
main_render_old = r"""      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full grid gap-8 lg:grid-cols-\[1fr_400px\]">
        \{\/\* Left Column - Creation Panel OR Requests \*\/\}
        <div>
          \{activeTab === "requests" \? \(
            <StudentRequestsSection requests=\{requests\} busyReqs=\{busyReqs\} \/>
          \) : \(
            <CreateQuizSection[\s\S]*?editingId=\{editingId\} cancelEdit=\{cancelEdit\}
            \/>
          \)\}
        </div>

        \{\/\* Right Column - My Quizzes \*\/\}
        <Section title="My Quizzes">
          <QuizListSection[\s\S]*?onEdit=\{editQuiz\}
          \/>
        </Section>
      </div>"""

main_render_new = """
      <div className="w-full flex-1 relative">
        {activeTab === "home" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <HomeSection quizzes={quizzes} requestsCount={requests.length} />
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <AnalyticsSection quizzes={quizzes} />
          </div>
        )}
        {activeTab === "students" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <PlaceholderView title="Classes & Students" icon="👥" text="Cohort management and individual settings coming soon." />
          </div>
        )}
        {activeTab === "quizzes" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <Section title="My Quizzes">
              <QuizListSection
                search={search} setSearch={setSearch} filterDept={filterDept} setFilterDept={setFilterDept}
                filterYear={filterYear} setFilterYear={setFilterYear} busyList={busyList} filtered={filtered}
                onDelete={deleteQuiz} onDuplicate={duplicateQuiz} onEdit={editQuiz}
              />
            </Section>
          </div>
        )}
        {activeTab === "requests" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <StudentRequestsSection requests={requests} busyReqs={busyReqs} />
          </div>
        )}
        {activeTab === "create" && (
          <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full animate-[fadeIn_0.3s_ease]">
            <CreateQuizSection
              saveStatus={saveStatus}
              form={form} setForm={setForm}
              questions={questions} setQuestions={setQuestions} addQuestion={addQuestion} removeQuestion={removeQuestion}
              updateQuestion={updateQuestion} updateOption={updateOption}
              saveQuiz={saveQuiz} busyCreate={busyCreate} profile={profile}
              difficulty={difficulty} setDifficulty={setDifficulty}
              timerMode={timerMode} setTimerMode={setTimerMode}
              timeValue={timeValue} setTimeValue={setTimeValue}
              maxAttempts={maxAttempts} setMaxAttempts={setMaxAttempts}
              aiMode={aiMode} setAiMode={setAiMode}
              topic={topic} setTopic={setTopic}
              file={file} setFile={setFile} onPickFile={onPickFile} fileRef={fileRef}
              instruction={instruction} setInstruction={setInstruction}
              numQuestions={numQuestions} setNumQuestions={setNumQuestions}
              numOptions={numOptions} setNumOptions={setNumOptions}
              aiLoading={aiLoading} aiError={aiError} generateWithAI={generateWithAI}
              clampedNumQ={clampedNumQ} clampedNumOpt={clampedNumOpt}
              generateMode={generateMode} setGenerateMode={setGenerateMode}
              editingId={editingId} cancelEdit={cancelEdit} fbUser={fbUser}
            />
          </div>
        )}
      </div>"""

match = re.search(main_render_old, code)
if match:
    code = code.replace(match.group(0), main_render_new)
else:
    print("Warning: could not find main render to replace.")

# 4. Insert StudentRequestsSection and PlaceholderView
# Since StudentRequestsSection is completely missing, we inject it at the bottom.
student_requests = """
/* --------------------------------- REQUESTS & PLACEHOLDERS --------------------------------- */

function StudentRequestsSection({ requests, busyReqs }) {
  if (busyReqs) return <Section title="Student Requests"><div className="p-8 text-center text-gray-500 rounded-2xl border border-gray-800 bg-gray-900/40">Loading requests...</div></Section>;
  return (
    <Section title="Student Requests">
      {requests.length === 0 ? (
        <Empty text="No pending edit requests from students right now." />
      ) : (
        <div className="grid gap-4">
          {requests.map(r => (
            <div key={r.id} className="p-5 rounded-2xl border border-gray-800 bg-gray-900/60 flex flex-col gap-2">
               <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-200">{r.studentName || "A student"}</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase bg-orange-900/30 text-orange-400 px-2 py-1 rounded border border-orange-800/50">Pending</span>
               </div>
               <div className="text-sm font-semibold text-indigo-400 mt-1">Quiz: {r.quizTitle || r.quizId || "Unknown Quiz"}</div>
               <p className="text-sm text-gray-300 bg-gray-950/50 p-3 rounded-xl border border-gray-800 mt-2">{r.reason || r.message || "No reason provided."}</p>
               <div className="flex gap-2 mt-4 justify-end">
                 <button className="px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 text-sm font-bold transition-all">Approve Edit</button>
                 <button className="px-4 py-2 rounded-xl border border-red-900/50 bg-red-900/20 hover:bg-red-900/40 text-red-400 text-sm font-bold transition-all">Dismiss</button>
               </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function PlaceholderView({ title, icon, text }) {
  return (
    <Section title={title}>
       <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/30 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="text-6xl mb-6 opacity-80">{icon}</div>
          <h3 className="text-xl font-bold text-gray-200 mb-2">{title} under construction</h3>
          <p className="text-gray-400 max-w-md">{text}</p>
       </div>
    </Section>
  );
}
"""

if "function StudentRequestsSection" not in code:
    code += "\n" + student_requests

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("done fixes")
