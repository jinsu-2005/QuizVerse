import re
import os

with open(r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update states
state_old = """  // Mode switching
  const [createMode, setCreateMode] = useState("custom"); // "ai" or "custom"
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Unlimited

  // AI Quiz Generation state
  const [aiMode, setAiMode] = useState("topic"); // 'topic' | 'file'
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("Create a multiple-choice quiz based on the provided text.");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOptions, setNumOptions] = useState(4);
  const [difficulty, setDifficulty] = useState("Moderate");
  const [timerMode, setTimerMode] = useState("off"); // 'off' | 'perQuestion' | 'total'
  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)


  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiQuiz, setAiQuiz] = useState(null); // {questions: [...], meta:{...}}
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef(null);

  // Custom quiz form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    academicYear: "",
  });
  const [questions, setQuestions] = useState([
    {
      question: "",
      options: ["", "", "", ""],
      answerIndex: 0, // store index of correct option
      explanation: "",
    },
  ]);"""

state_new = """  // Mode switching
  const [createMode, setCreateMode] = useState("create"); // "create" or "requests"
  const [generateMode, setGenerateMode] = useState("ai"); // "ai" or "manual"
  const [sourceMode, setSourceMode] = useState("custom"); // "custom" or "file" or "topic"
  const [editingId, setEditingId] = useState(null);

  // Common Meta
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Unlimited
  const [difficulty, setDifficulty] = useState("Moderate");
  const [timerMode, setTimerMode] = useState("off"); // 'off' | 'perQuestion' | 'total'
  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)

  // AI Quiz Generation state
  const [aiMode, setAiMode] = useState("topic"); // 'topic' | 'file'
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("Create a multiple-choice quiz based on the provided text.");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOptions, setNumOptions] = useState(4);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const fileRef = useRef(null);

  // Quiz form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    department: "",
    academicYear: "",
  });
  const [questions, setQuestions] = useState([
    {
      question: "",
      options: ["", "", "", ""],
      answerIndex: 0, // store index of correct option
      explanation: "",
    },
  ]);"""

code = code.replace(state_old, state_new)


# 2. Update generateWithAI
gen_ai_old = """      setAiQuiz({
        questions: editableQuestions,
        meta: {
          difficulty,
          timer: timerSettings,
          sourceMode: aiMode,
          topic: aiMode === "file" ? (file?.name || "Uploaded Document") : topic.trim(),
          createdPreviewAt: Date.now(),
        },
      });
    } catch (err) {"""

gen_ai_new = """      setQuestions(editableQuestions);
      setSourceMode(aiMode);
      setGenerateMode("manual");
      setForm(f => ({
        ...f,
        title: aiMode === "file" ? (file?.name || "Uploaded Document") : topic.trim()
      }));
    } catch (err) {"""

code = code.replace(gen_ai_old, gen_ai_new)
code = code.replace("setAiError(\"\");\n    setAiQuiz(null);", "setAiError(\"\");")

# 3. Remove updateAiQuestion... publishAiQuiz
import re
code = re.sub(r'  const updateAiQuestion = \(idx, patch\) => \{[\s\S]*?  const addQuestion = \(\) =>', '  const addQuestion = () =>', code)


# 4. Replace createQuiz with saveQuiz
save_quiz_old = """  const createQuiz = async () => {
    if (!fbUser) return;
    // basic validations
    if (!form.title.trim()) return setToast({ type: "error", msg: "Title is required." });
    if (!form.department || !form.academicYear)
      return setToast({ type: "error", msg: "Select department & year." });
    for (const q of questions) {
      if (!q.question.trim()) return setToast({ type: "error", msg: "Fill all questions." });
      if (q.options.some((o) => !o.trim()))
        return setToast({ type: "error", msg: "Fill all options." });
    }

    setBusyCreate(true);
    try {
      const timerSettings = { mode: timerMode, time: timeValue };
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || "",
        createdBy: teacherMeta.uid,
        createdByName: teacherMeta.displayName,
        department: form.department,
        academicYear: form.academicYear,
        institute: teacherMeta.institute || null,
        difficulty: difficulty,
        timer: timerSettings,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          answer: q.options[q.answerIndex]?.trim() ?? "",
          explanation: q.explanation.trim(),
        })),
        createdAt: serverTimestamp(),
        sourceMode: "custom",
        maxAttempts: Number(maxAttempts) || 0,
      };

      console.log("[DEBUG] Custom quiz creating with:", {
        title: payload.title,
        dept: payload.department,
        year: payload.academicYear
      });

      const ref = await addDoc(collection(db, "quizzes"), payload);
      await setDoc(doc(db, "users", teacherMeta.uid, "teacherQuizzes", ref.id), {
        quizId: ref.id,
        title: payload.title,
        createdAt: serverTimestamp(),
        department: payload.department,
        academicYear: payload.academicYear,
      });

      setToast({ type: "ok", msg: "Quiz created." });
      // reset minimal
      setForm({ title: "", description: "", department: "", academicYear: "" });
      setMaxAttempts(0);
      setQuestions([
        { question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" },
      ]);
    } catch (e) {
      console.error("Create quiz error:", e);
      setToast({ type: "error", msg: "Failed to create quiz." });
    } finally {
      setBusyCreate(false);
    }
  };"""

save_quiz_new = """  const saveQuiz = async () => {
    if (!fbUser) return;
    // basic validations
    if (!form.title.trim()) return setToast({ type: "error", msg: "Title is required." });
    if (!form.department || !form.academicYear)
      return setToast({ type: "error", msg: "Select department & year." });
    for (const q of questions) {
      if (!q.question.trim()) return setToast({ type: "error", msg: "Fill all questions." });
      if (q.options.some((o) => !o.trim()))
        return setToast({ type: "error", msg: "Fill all options." });
    }

    setBusyCreate(true);
    try {
      const timerSettings = { mode: timerMode, time: timeValue };
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || "",
        department: form.department,
        academicYear: form.academicYear,
        difficulty: difficulty,
        timer: timerSettings,
        questions: questions.map((q) => ({
          question: q.question.trim(),
          options: q.options.map((o) => o.trim()),
          answer: q.options[q.answerIndex]?.trim() ?? "",
          explanation: q.explanation.trim(),
        })),
        maxAttempts: Number(maxAttempts) || 0,
      };
      
      if (editingId) {
        payload.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "quizzes", editingId), payload);
        await setDoc(doc(db, "users", teacherMeta.uid, "teacherQuizzes", editingId), {
          quizId: editingId,
          title: payload.title,
          updatedAt: serverTimestamp(),
          department: payload.department,
          academicYear: payload.academicYear,
        }, { merge: true });
        setToast({ type: "ok", msg: "Quiz updated." });
      } else {
        payload.createdBy = teacherMeta.uid;
        payload.createdByName = teacherMeta.displayName;
        payload.institute = teacherMeta.institute || null;
        payload.createdAt = serverTimestamp();
        payload.sourceMode = sourceMode;

        const ref = await addDoc(collection(db, "quizzes"), payload);
        await setDoc(doc(db, "users", teacherMeta.uid, "teacherQuizzes", ref.id), {
          quizId: ref.id,
          title: payload.title,
          createdAt: serverTimestamp(),
          department: payload.department,
          academicYear: payload.academicYear,
        });

        setToast({ type: "ok", msg: "Quiz created." });
      }

      // reset minimal
      setForm({ title: "", description: "", department: "", academicYear: "" });
      setMaxAttempts(0);
      setQuestions([{ question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }]);
      setEditingId(null);
      setSourceMode("custom");
      setGenerateMode("manual");
    } catch (e) {
      console.error("Save quiz error:", e);
      setToast({ type: "error", msg: "Failed to save quiz." });
    } finally {
      setBusyCreate(false);
    }
  };

  const cancelEdit = () => {
    setForm({ title: "", description: "", department: "", academicYear: "" });
    setMaxAttempts(0);
    setQuestions([{ question: "", options: ["", "", "", ""], answerIndex: 0, explanation: "" }]);
    setEditingId(null);
    setSourceMode("custom");
    setGenerateMode("manual");
  };"""

code = code.replace(save_quiz_old, save_quiz_new)


# 5. Fix editQuiz
edit_quiz_old = """  const editQuiz = (quiz) => {
    // Load quiz into AI quiz editor for editing
    const editableQuestions = quiz.questions.map(q => ({
      question: q.question,
      options: q.options || ["", "", "", ""],
      answerIndex: q.options?.findIndex(opt => opt === q.answer) || 0,
      explanation: q.explanation || "",
    }));

    setAiQuiz({
      questions: editableQuestions,
      meta: {
        difficulty: quiz.difficulty || "Moderate",
        timer: quiz.timer || { mode: "off", time: 30 },
        sourceMode: quiz.sourceMode || "custom",
        topic: quiz.title,
        createdPreviewAt: Date.now(),
        editingId: quiz.id, // Mark as editing existing quiz
      },
    });

    // --- FIX 1 of 2: Populate form state when editing ---
    // Populate the AI form with the quiz's current data so it can be edited.
    setTopic(quiz.title);
    setDifficulty(quiz.difficulty || "Moderate");
    setTimerMode(quiz.timer?.mode || "off");
    setTimeValue(quiz.timer?.time || (quiz.timer?.mode === "total" ? 10 : 30));
    setMaxAttempts(quiz.maxAttempts || 0);
    // --- END OF FIX ---

    setCreateMode("ai"); // Switch to AI mode for editing
  };"""

edit_quiz_new = """  const editQuiz = (quiz) => {
    const editableQuestions = quiz.questions.map(q => ({
      question: q.question,
      options: q.options || ["", "", "", ""],
      answerIndex: q.options?.findIndex(opt => opt === q.answer) || 0,
      explanation: q.explanation || "",
    }));

    setQuestions(editableQuestions);
    setForm({
      title: quiz.title || "",
      description: quiz.description || "",
      department: quiz.department || "",
      academicYear: quiz.academicYear || "",
    });
    setDifficulty(quiz.difficulty || "Moderate");
    setTimerMode(quiz.timer?.mode || "off");
    setTimeValue(quiz.timer?.time || (quiz.timer?.mode === "total" ? 10 : 30));
    setMaxAttempts(quiz.maxAttempts || 0);
    setEditingId(quiz.id);
    setSourceMode(quiz.sourceMode || "custom");

    setCreateMode("create");
    setGenerateMode("manual");
  };"""
code = code.replace(edit_quiz_old, edit_quiz_new)

# 6. Remove updateExistingQuiz 
code = re.sub(r'  const updateExistingQuiz = async \(\) => \{[\s\S]*?  return \(', '  return (', code)

# 7. Update Tabs
tabs_old = """      <div className="mt-8 border-b border-gray-800">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {[
            { key: "ai", label: "AI Quiz Generator" },
            { key: "custom", label: "Custom Quiz Creator" },
            { key: "requests", label: `Student Requests ${requests.length > 0 ? `(${requests.length})` : ""}` }
          ].map((mode) => ("""

tabs_new = """      <div className="mt-8 border-b border-gray-800">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          {[
            { key: "create", label: "Create Quiz" },
            { key: "requests", label: `Student Requests ${requests.length > 0 ? `(${requests.length})` : ""}` }
          ].map((mode) => ("""

code = code.replace(tabs_old, tabs_new)

# 8. Main content area rendering CreateQuizSection
render_area_old = """        <div>
          {createMode === "requests" ? (
            <StudentRequestsSection requests={requests} busyReqs={busyReqs} />
          ) : createMode === "ai" ? (

            <AiQuizSection
              aiMode={aiMode}
              setAiMode={setAiMode}
              topic={topic}
              setTopic={setTopic}
              file={file}
              setFile={setFile}
              onPickFile={onPickFile}
              fileRef={fileRef}
              instruction={instruction}
              setInstruction={setInstruction}
              numQuestions={numQuestions}
              setNumQuestions={setNumQuestions}
              numOptions={numOptions}
              setNumOptions={setNumOptions}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
              aiLoading={aiLoading}
              aiError={aiError}
              generateWithAI={generateWithAI}
              clampedNumQ={clampedNumQ}
              clampedNumOpt={clampedNumOpt}
            />
          ) : (

            <CustomQuizSection
              form={form}
              setForm={setForm}
              questions={questions}
              addQuestion={addQuestion}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
              updateOption={updateOption}
              createQuiz={createQuiz}
              busyCreate={busyCreate}
              profile={profile}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
            />

          )}
        </div>"""

render_area_new = """        <div>
          {createMode === "requests" ? (
            <StudentRequestsSection requests={requests} busyReqs={busyReqs} />
          ) : (
            <CreateQuizSection
              form={form} setForm={setForm}
              questions={questions} addQuestion={addQuestion} removeQuestion={removeQuestion}
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
              editingId={editingId} cancelEdit={cancelEdit}
            />
          )}
        </div>"""

code = code.replace(render_area_old, render_area_new)

# 9. Remove AiQuizPreviewSection render
preview_render_old = """      {/* AI Quiz Preview & Editor */}
      {aiQuiz?.questions?.length ? (
        <AiQuizPreviewSection
          aiQuiz={aiQuiz}
          setAiQuiz={setAiQuiz}
          updateAiQuestion={updateAiQuestion}
          removeAiQuestion={removeAiQuestion}
          updateAiOption={updateAiOption}
          publishAiQuiz={publishAiQuiz}
          updateExistingQuiz={updateExistingQuiz}
          publishing={publishing}
        />
      ) : null}"""
code = code.replace(preview_render_old, "")

# 10. Replace AiQuizSection, CustomQuizSection, AiQuizPreviewSection components with CreateQuizSection

# Find where AiQuizSection starts and remove it all the way up to QuizListSection

code = re.sub(r'/\* -------------------------------- AI QUIZ SECTION -------------------------------- \*/[\s\S]*?/\* -------------------------------- QUIZ LIST SECTION -------------------------------- \*/', '/* -------------------------------- QUIZ LIST SECTION -------------------------------- */', code)

code = re.sub(r'/\* -------------------------------- AI QUIZ PREVIEW SECTION -------------------------------- \*/[\s\S]*?/\* -------------------------------- UI COMPONENTS -------------------------------- \*/', '/* -------------------------------- UI COMPONENTS -------------------------------- */', code)

# Define CreateQuizSection

create_quiz_section = """/* -------------------------------- CREATE QUIZ SECTION -------------------------------- */

function CreateQuizSection({
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, saveQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode,
  timeValue, setTimeValue, maxAttempts, setMaxAttempts,
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt,
  generateMode, setGenerateMode, editingId, cancelEdit
}) {

  const toggleMode = (mode) => {
    if (editingId && mode === "ai") {
      alert("You are currently editing an existing quiz. Please save or cancel before using the AI Generator.");
      return;
    }
    setGenerateMode(mode);
  };

  return (
    <Section title={editingId ? "Edit Quiz" : "Create Quiz"}>
      <div className="relative overflow-hidden rounded-3xl border border-gray-800 bg-gray-900/60 backdrop-blur-2xl p-4 sm:p-6 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_32px_-12px_rgba(79,70,229,0.25)] flex flex-col gap-6">
        <div className="pointer-events-none absolute -top-20 -left-20 h-56 w-56 rounded-full bg-indigo-600/10 blur-3xl" />
        
        {/* Toggle Mode */}
        {!editingId && (
          <div className="relative z-10 flex p-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl w-full">
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

        {/* Common Quiz Setup */}
        <div className="relative z-10 grid gap-6">
          <Field
            label="Title"
            value={form.title}
            onChange={(v) => setForm({ ...form, title: v })}
            placeholder="e.g., Basics of C Programming"
          />
          <Field
            label="Short Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder="A short one-liner about this quiz"
          />

          <div className="grid sm:grid-cols-2 gap-4">
            <Select
              label="Department"
              value={form.department}
              onChange={(v) => setForm({ ...form, department: v })}
              options={[{ value: "IT", text: "Information Technology (IT)" }, { value: "CSE", text: "Computer Science and Engineering (CSE)" }, { value: "ECE", text: "Electronics and Communication Engineering (ECE)" }, { value: "EEE", text: "Electrical and Electronics Engineering (EEE)" }, { value: "MECH", text: "Mechanical Engineering (MECH)" }, { value: "CIVIL", text: "Civil Engineering (CIVIL)" }, { value: "AIDS", text: "Artificial Intelligence and Data Science (AIDS)" }, { value: "AIML", text: "Artificial Intelligence and Machine Learning (AIML)" }]}
            />
            <Select
              label="Academic Year"
              value={form.academicYear}
              onChange={(v) => setForm({ ...form, academicYear: v })}
              options={["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"].map((y) => ({ value: y, text: y }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={["Easy", "Moderate", "Hard"]}
            />
            <NumberField
              label="Limit Attempts (0 - 5)"
              value={maxAttempts}
              onChange={(v) => setMaxAttempts(v)}
              onBlur={(v) => setMaxAttempts(Math.min(5, Math.max(0, Number(maxAttempts || 0))))} min={0} max={5}
            />
            <div>
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Timer</label>
              <div className="grid grid-cols-3 gap-1.5 bg-gray-900/80 border border-gray-700/60 rounded-2xl p-1.5 w-full">
                {["off", "perQuestion", "total"].map((t) => (
                  <button
                    key={t} type="button" onClick={() => setTimerMode(t)}
                    className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${timerMode === t ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}
                  >
                    {t === "perQuestion" ? "Per Q" : t === "total" ? "Total" : "Off"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {(timerMode === "perQuestion" || timerMode === "total") && (
            <div>
              <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">
                {timerMode === "perQuestion" ? "Seconds per Question (≥ 10)" : "Total Minutes (≥ 1)"}
              </label>
              <input
                type="number"
                min={timerMode === "perQuestion" ? 10 : 1}
                value={timeValue}
                onChange={(e) => setTimeValue(Math.max(timerMode === "perQuestion" ? 10 : 1, Number(e.target.value)))}
                className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-gray-500 text-gray-100"
              />
            </div>
          )}
        </div>

        <hr className="border-gray-800/80 my-2" />

        {/* AI Generate Flow */}
        {generateMode === "ai" && (
           <form onSubmit={generateWithAI} className="relative z-10 flex flex-col gap-6">
              <div className="flex bg-gray-900/80 border border-gray-700/60 p-1.5 rounded-2xl">
                {["topic", "file"].map((m) => (
                  <button
                    key={m} type="button" onClick={() => setAiMode(m)}
                    className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-300 ${aiMode === m ? "bg-indigo-600/30 border border-indigo-500 text-indigo-300" : "text-gray-400 hover:text-gray-200"}`}
                  >
                    {m === "topic" ? "From Topic" : "From File"}
                  </button>
                ))}
              </div>
              
              {aiMode === "topic" ? (
                 <Field label="Topic" value={topic} onChange={setTopic} placeholder="e.g., Data Structures" />
              ) : (
                <div className="space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">Upload .txt or .csv</label>
                  <div onClick={() => fileRef.current?.click()} className="w-full cursor-pointer rounded-2xl border-2 border-dashed border-gray-700/80 bg-gray-800/40 px-5 py-6 text-center hover:border-indigo-500 hover:bg-gray-800/60 transition-all group">
                    <div className="text-sm font-semibold text-gray-300 group-hover:text-indigo-300">{file ? file.name : "Click to choose a file"}</div>
                  </div>
                  <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv" onChange={onPickFile} />
                  <div>
                    <label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Instruction</label>
                    <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="E.g., Create 8 MCQs..." className="w-full rounded-2xl border border-gray-700/80 bg-gray-800/60 px-5 py-3.5 text-[15px] outline-none transition-all focus:border-indigo-500 focus:bg-gray-800" rows={3} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <NumberField label="Questions (1-100)" value={numQuestions} onChange={v=>setNumQuestions(v)} onBlur={() => setNumQuestions(clampedNumQ(numQuestions))} min={1} max={100} />
                <NumberField label="Options (2-10)" value={numOptions} onChange={v=>setNumOptions(v)} onBlur={() => setNumOptions(clampedNumOpt(numOptions))} min={2} max={10} />
              </div>

              {aiError && <div className="rounded-xl border border-red-900/50 bg-red-950/40 p-3 text-xs text-red-300">{aiError}</div>}
              
              <button type="submit" disabled={aiLoading} className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 shadow-lg text-white py-3.5 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-gray-700 disabled:scale-100 disabled:text-gray-400">
                {aiLoading ? "Generating Questions..." : "Generate Questions with AI"}
              </button>
           </form>
        )}

        {/* Manual Create Flow & Question Cards */}
        {generateMode === "manual" && (
          <div className="relative z-10 flex flex-col gap-5 pb-20 sm:pb-0">
            <div className="flex justify-between items-center text-sm font-bold text-gray-300">
              <span>{questions.length} Question{questions.length !== 1 ? 's' : ''}</span>
            </div>
            
            <div className="grid gap-4">
              {questions.map((q, i) => (
                <QuestionCard 
                  key={i} q={q} i={i} 
                  removeQuestion={removeQuestion} updateQuestion={updateQuestion} updateOption={updateOption} 
                  canRemove={questions.length > 1}
                />
              ))}
            </div>

            <button onClick={addQuestion} className="w-full rounded-xl border-2 border-dashed border-gray-700 bg-gray-800/40 hover:bg-gray-800/80 hover:border-gray-500 text-gray-300 py-4 text-sm font-bold transition-all">
              + Add another question
            </button>
            
            {/* Desktop Save Area */}
            <div className="hidden sm:flex justify-end gap-4 mt-4">
              {editingId && (
                <button onClick={cancelEdit} className="rounded-xl px-6 py-3 font-bold bg-transparent border border-gray-600 hover:bg-gray-800">
                   Cancel
                </button>
              )}
              <button onClick={saveQuiz} disabled={busyCreate} className="rounded-xl px-8 py-3 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 text-white font-bold transition-all hover:scale-105 active:scale-95 disabled:bg-gray-700 disabled:scale-100 disabled:shadow-none">
                {busyCreate ? "Saving..." : (editingId ? "Update Quiz" : "Publish Quiz")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky Action Bar */}
      {generateMode === "manual" && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 safe-bottom">
          <div className="flex gap-3 max-w-7xl mx-auto">
             {editingId && (
               <button onClick={cancelEdit} className="w-1/3 rounded-xl border border-gray-700 bg-gray-800 text-white font-bold">
                 Cancel
               </button>
             )}
             <button onClick={saveQuiz} disabled={busyCreate} className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 shadow-lg shadow-indigo-900/30 disabled:bg-gray-700 disabled:scale-100">
               {busyCreate ? "Saving..." : (editingId ? "Update Quiz" : "Publish Quiz")}
             </button>
          </div>
        </div>
      )}
    </Section>
  );
}

function QuestionCard({ q, i, removeQuestion, updateQuestion, updateOption, canRemove }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`rounded-xl border transition-all ${collapsed ? "border-gray-800 bg-gray-900/40 p-4" : "border-gray-700 bg-gray-800/70 p-5 shadow-lg"}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
          <div className="font-bold text-sm text-indigo-400 mb-1">Question {i + 1}</div>
          {collapsed && <div className="text-gray-300 text-sm line-clamp-1">{q.question || "Empty question"}</div>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400">
             {collapsed ? "Expand" : "Collapse"}
          </button>
          <button disabled={!canRemove} onClick={() => removeQuestion(i)} className="p-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 text-red-400 disabled:opacity-30">
             Remove
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-4 space-y-4 animate-[fadeIn_0.2s_ease]">
          <textarea
            value={q.question}
            onChange={(e) => updateQuestion(i, { question: e.target.value })}
            placeholder="Type your question..."
            rows={2}
            className="w-full rounded-xl border border-gray-700/80 bg-gray-900/60 px-4 py-3 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-gray-600"
          />

          <div className="grid sm:grid-cols-2 gap-3">
            {q.options.map((opt, oi) => (
              <div key={oi} className="relative group">
                <input
                  value={opt}
                  onChange={(e) => updateOption(i, oi, e.target.value)}
                  placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                  className={`w-full rounded-xl border ${q.answerIndex === oi ? 'border-green-500/50 bg-green-950/20 shadow-[0_0_15px_-3px_rgba(34,197,94,0.1)]' : 'border-gray-700/80 bg-gray-900/60'} px-4 py-3 pb-8 text-sm outline-none transition-all focus:border-indigo-500`}
                />
                <button
                  type="button"
                  onClick={() => updateQuestion(i, { answerIndex: oi })}
                  className={`absolute right-2 bottom-2 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all ${q.answerIndex === oi
                    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                    }`}
                >
                  {q.answerIndex === oi ? "Correct" : "Set Correct"}
                </button>
              </div>
            ))}
          </div>

          <textarea
            value={q.explanation}
            onChange={(e) => updateQuestion(i, { explanation: e.target.value })}
            placeholder="Explanation (Optional)"
            rows={1}
            className="w-full rounded-xl border border-gray-700/80 bg-gray-900/60 px-4 py-2 text-sm outline-none focus:border-indigo-500 placeholder:text-gray-600"
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------- QUIZ LIST SECTION -------------------------------- */
"""

code = re.sub(r'/\* -------------------------------- QUIZ LIST SECTION -------------------------------- \*/', create_quiz_section, code)


with open(r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Replacement complete.")
