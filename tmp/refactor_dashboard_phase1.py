import re
import os

filepath = r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add Autosave Hook Logic to TeacherDashboard
init_state_end = r'  const \[busyCreate, setBusyCreate\] = useState\(false\);'
autosave_logic = """  const [busyCreate, setBusyCreate] = useState(false);

  // --- Autosave Logic (Phase 1) ---
  const [saveStatus, setSaveStatus] = useState("");
  useEffect(() => {
    if (editingId || !fbUser) return; // Only autosave new custom drafts for now
    if (createMode !== "create") return;
    
    setSaveStatus("Saving...");
    const timeout = setTimeout(() => {
       const draft = { form, questions, difficulty, timerMode, timeValue, maxAttempts, sourceMode };
       localStorage.setItem("quizVerseDraft", JSON.stringify(draft));
       setSaveStatus("Draft Saved ✓");
       setTimeout(() => setSaveStatus(""), 2000);
    }, 1500);

    return () => clearTimeout(timeout);
  }, [form, questions, difficulty, timerMode, timeValue, maxAttempts, sourceMode, createMode, editingId, fbUser]);
  
  // Load draft on mount
  useEffect(() => {
    const saved = localStorage.getItem("quizVerseDraft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (window.confirm("You have an unsaved draft. Do you want to restore it?")) {
           setForm(parsed.form || form);
           setQuestions(parsed.questions || questions);
           setDifficulty(parsed.difficulty || "Moderate");
           setTimerMode(parsed.timerMode || "off");
           setTimeValue(parsed.timeValue || 30);
           setMaxAttempts(parsed.maxAttempts || 0);
           setSourceMode(parsed.sourceMode || "custom");
           setGenerateMode("manual");
        } else {
           localStorage.removeItem("quizVerseDraft");
        }
      } catch (e) {}
    }
  }, []);"""

code = re.sub(init_state_end, autosave_logic, code, count=1)


# 2. Replace TeacherDashboard layout structure
old_layout = r"""    <Screen>
      <Header
        profile={profile}
        fbUser={fbUser}
        onOpenProfile={\(\) => setOpenProfile\(true\)}
      />

      \{\/\* Mode Selection Tabs \*\/\}
      <div className="mt-8 border-b border-gray-800">
        <div className="flex gap-6 overflow-x-auto hide-scrollbar">
          \{\[
            \{ key: "create", label: "Create Quiz" \},
            \{ key: "requests", label: `Student Requests \$\{requests.length > 0 \? `\(\$\{requests.length\}\)` : ""\}` \}
          \]\.map\(\(mode\) => \(
            <button
              key=\{mode\.key\}
              onClick=\{\(\) => setCreateMode\(mode\.key\)\}
              className=\{`relative pb-4 text-sm font-bold transition-colors whitespace-nowrap \$\{createMode === mode\.key
                \? "text-indigo-400"
                : "text-gray-400 hover:text-gray-200"
                \}`\}
            >
              \{mode\.label\}
              \{createMode === mode\.key && \(
                <span className="absolute bottom-0 left-0 w-full h-0\.5 bg-indigo-500 rounded-t-full shadow-\[0_0_8px_rgba\(99,102,241,0\.6\)\] animate-\[fadeIn_0\.3s_ease\]" />
              \)\}
            </button>
          \)\)\}
        </div>
      </div>

      \{\/\* Main Content Grid \*\/\}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">"""

new_layout = """    <SidebarLayout 
      profile={profile} fbUser={fbUser} onOpenProfile={() => setOpenProfile(true)}
      activeTab={createMode} onTabSelect={setCreateMode} requestsCount={requests.length}
    >
      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full grid gap-8 lg:grid-cols-[1fr_400px]">"""

code = re.sub(old_layout, new_layout, code)

# 3. Add saveStatus to CreateQuizSection and pass it down
react_props_old = r"""          \) : \(
            <CreateQuizSection
              form=\{form\} setForm=\{setForm\}"""

react_props_new = """          ) : (
            <CreateQuizSection
              saveStatus={saveStatus}
              form={form} setForm={setForm}"""

code = re.sub(react_props_old, react_props_new, code)


# 4. Modify CreateQuizSection declaration to accept saveStatus and show it
cqs_old = r"""function CreateQuizSection\(\{
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, saveQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode,
  timeValue, setTimeValue, maxAttempts, setMaxAttempts,
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt,
  generateMode, setGenerateMode, editingId, cancelEdit
\}\) \{"""

cqs_new = """function CreateQuizSection({
  saveStatus,
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, saveQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode,
  timeValue, setTimeValue, maxAttempts, setMaxAttempts,
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt,
  generateMode, setGenerateMode, editingId, cancelEdit
}) {"""

code = code.replace(cqs_old, cqs_new)

header_section_old = r"""    <Section title=\{editingId \? "Edit Quiz" : "Create Quiz"\}>"""
header_section_new = """    <Section title={editingId ? "Edit Quiz" : "Create Quiz"}>
      {saveStatus && <div className="absolute top-0 right-0 py-1 px-3 text-xs font-bold text-green-400 bg-green-900/20 border border-green-800/30 rounded-full animate-[fadeIn_0.3s_ease]">{saveStatus}</div>}"""
code = code.replace(header_section_old, header_section_new)

# 5. Replace `</Screen>` with `</SidebarLayout>` at the end of TeacherDashboard
code = code.replace("    </Screen>", "    </SidebarLayout>")


# 6. Replace `Screen` and `Header` components with `SidebarLayout`
ui_components_old = r"""/\* -------------------------------- UI COMPONENTS -------------------------------- \*/

function Screen\(\{ children \}\) \{
[\s\S]*?function Header\(\{ profile, fbUser, onOpenProfile \}\) \{[\s\S]*?  \);
\}"""


ui_components_new = """/* -------------------------------- UI COMPONENTS -------------------------------- */

function SidebarLayout({ children, activeTab, onTabSelect, requestsCount, profile, fbUser, onOpenProfile }) {
  return (
    <div className="flex h-[100dvh] bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-800/60 bg-gray-950/70 backdrop-blur-3xl shrink-0 z-50">
        <div className="p-6 border-b border-gray-800/60 flex items-center gap-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 font-bold shadow-lg shadow-indigo-500/30">Q</div>
          <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gray-100 to-gray-400">Teacher</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {[
            { key: "create", icon: "✨", label: "Create Quiz" },
            { key: "requests", icon: "📋", label: "Student Requests", badge: requestsCount > 0 ? requestsCount : null },
          ].map(tab => (
            <button key={tab.key} onClick={() => onTabSelect(tab.key)} className={`w-full flex justify-between items-center px-4 py-3.5 rounded-xl font-bold transition-all ${activeTab === tab.key ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"}`}>
               <div className="flex items-center gap-3">
                 <span className="text-lg">{tab.icon}</span>
                 {tab.label}
               </div>
               {tab.badge && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{tab.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800/60">
           <button onClick={onOpenProfile} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-gray-800/50 transition-colors group">
             <img src={profile?.photoURL || fbUser?.photoURL || "https://ui-avatars.com/api/?name=T"} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-transparent group-hover:border-indigo-500 transition-colors" />
             <div className="text-left flex-1 min-w-0">
               <div className="text-sm font-bold text-gray-200 truncate">{profile?.name || fbUser?.displayName || "Teacher"}</div>
               <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">Profile Settings</div>
             </div>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative overscroll-y-none">
        <div className="pointer-events-none fixed -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="pointer-events-none fixed -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-40">
           <div className="flex items-center gap-3">
             <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 font-bold text-xs shadow-lg">Q</div>
             <div className="font-bold tracking-tight">Teacher Dashboard</div>
           </div>
           <button onClick={onOpenProfile}>
             <img src={profile?.photoURL || fbUser?.photoURL || "https://ui-avatars.com/api/?name=T"} alt="avatar" className="w-8 h-8 rounded-full border border-gray-700" />
           </button>
        </div>

        <div className="pb-24 md:pb-6 relative z-10 h-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 safe-bottom">
         <div className="flex justify-around p-2">
            {[
              { key: "create", icon: "✨", label: "Create" },
              { key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 ? requestsCount : null },
            ].map(tab => (
              <button key={tab.key} onClick={() => onTabSelect(tab.key)} className={`relative flex flex-col items-center p-2 rounded-xl transition-colors ${activeTab === tab.key ? "text-indigo-400" : "text-gray-500 hover:text-gray-300"}`}>
                 <span className="text-xl mb-1">{tab.icon}</span>
                 <span className="text-[10px] font-bold">{tab.label}</span>
                 {tab.badge && <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500"></span>}
              </button>
            ))}
         </div>
      </nav>
    </div>
  );
}"""

code = re.sub(ui_components_old, ui_components_new, code)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("done phase 1 refactor.")
