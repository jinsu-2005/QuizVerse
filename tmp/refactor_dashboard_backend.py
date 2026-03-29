import re

filepath = r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Replace the placeholder views with actual components
main_render_old = r"""        \{activeTab === "home" && <PlaceholderView title="Dashboard Overview" icon="🏠" text="High-level metrics and active quiz summaries coming soon\." />\}
        \{activeTab === "analytics" && <PlaceholderView title="Analytics & Reports" icon="📈" text="Macro-level student performance across all quizzes coming soon\." />\}
        \{activeTab === "students" && <PlaceholderView title="Classes & Students" icon="👥" text="Cohort management and individual settings coming soon\." />\}"""

main_render_new = """        {activeTab === "home" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
            <HomeSection quizzes={quizzes} requestsCount={requests.length} />
          </div>
        )}
        {activeTab === "analytics" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
            <AnalyticsSection quizzes={quizzes} />
          </div>
        )}
        {activeTab === "students" && <PlaceholderView title="Classes & Students" icon="👥" text="Cohort management and individual settings coming soon." />}"""

code = re.sub(main_render_old, main_render_new, code)


# 2. Add HomeSection and AnalyticsSection components at the bottom
new_components = """
/* -------------------------------- HOME & ANALYTICS -------------------------------- */

function HomeSection({ quizzes, requestsCount }) {
  const [attemptsInfo, setAttemptsInfo] = useState({ total: 0, loading: true });

  useEffect(() => {
    let unmounted = false;
    const load = async () => {
      if (quizzes.length === 0) {
        if (!unmounted) setAttemptsInfo({ total: 0, loading: false });
        return;
      }
      try {
        // Query attempts. Since "in" requires array <=10, we'll just fetch all and filter client-side if needed, OR 
        // a better approach: query all attempts where quizId is in the teacher's quizzes array (chunked).
        // For simplicity in this UI, we do chunks of 10.
        const quizIds = quizzes.map(q => q.id);
        const chunks = [];
        for (let i = 0; i < quizIds.length; i += 10) chunks.push(quizIds.slice(i, i + 10));
        
        let totalAttempts = 0;
        for (const chunk of chunks) {
           const qRef = query(collection(db, "quizAttempts"), where("quizId", "in", chunk));
           const snap = await getDocs(qRef);
           totalAttempts += snap.docs.length;
        }
        if (!unmounted) setAttemptsInfo({ total: totalAttempts, loading: false });
      } catch (e) {
        if (!unmounted) setAttemptsInfo({ total: "-", loading: false });
      }
    };
    load();
    return () => { unmounted = true; };
  }, [quizzes]);

  const activeQuizzes = quizzes.filter(q => q.status === "published").length;
  const draftQuizzes = quizzes.filter(q => q.status !== "published").length;

  return (
    <Section title="Dashboard Overview">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Quizzes" value={quizzes.length} icon="📚" color="from-indigo-500 to-blue-500" />
        <MetricCard label="Active / Draft" value={`${activeQuizzes} / ${draftQuizzes}`} icon="✨" color="from-purple-500 to-pink-500" />
        <MetricCard label="Student Requests" value={requestsCount} icon="📋" color="from-orange-500 to-red-500" />
        <MetricCard label="Total Attempts" value={attemptsInfo.loading ? "..." : attemptsInfo.total} icon="📈" color="from-green-500 to-emerald-500" />
      </div>

      <div className="rounded-2xl border border-gray-800/80 bg-gray-900/40 p-6 flex flex-col items-center justify-center text-center">
         <div className="text-4xl mb-4">🚀</div>
         <h3 className="text-xl font-bold text-gray-200 mb-2">Welcome back!</h3>
         <p className="text-gray-400 max-w-md">Your students have completed {attemptsInfo.loading ? "..." : attemptsInfo.total} quizzes so far. Keep up the great work by creating a new quiz or reviewing analytics.</p>
      </div>
    </Section>
  );
}

function MetricCard({ label, value, icon, color }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-xl group hover:border-gray-600 transition-colors">
       <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
       <div className="flex items-center gap-4 relative z-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800 border border-gray-700 text-2xl">{icon}</div>
          <div>
            <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{label}</div>
            <div className="text-2xl font-black text-gray-100">{value}</div>
          </div>
       </div>
    </div>
  );
}

function AnalyticsSection({ quizzes }) {
   if (quizzes.length === 0) {
      return (
        <Section title="Analytics Overview">
           <Empty text="Create and publish quizzes to see analytics." />
        </Section>
      );
   }

   return (
     <Section title="Analytics Overview">
       <div className="grid gap-6">
         <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
            <h3 className="text-lg font-bold text-gray-200 mb-4">Performance by Quiz</h3>
            <p className="text-sm text-gray-400 mb-6">Detailed analytics across all your published quizzes. Expand a quiz in the "My Quizzes" tab to see specific student interactions.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.slice(0, 6).map(q => (
                 <div key={q.id} className="p-4 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-800 transition-colors">
                    <div className="text-sm font-bold text-gray-300 line-clamp-1 mb-1">{q.title}</div>
                    <div className="text-xs text-gray-500">{q.difficulty} • {q.department}</div>
                 </div>
              ))}
            </div>
         </div>
       </div>
     </Section>
   );
}
"""

if "function HomeSection" not in code:
    code += new_components

# Add Question Bank UI
# Inside CreateQuizSection wizard, we will add a button to open Question Bank.

question_bank_styles = """
  const [showQB, setShowQB] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadBank, setLoadBank] = useState(false);

  useEffect(() => {
    if (!showQB || !fbUser || bankQuestions.length > 0) return;
    const fetchBank = async () => {
      setLoadBank(true);
      try {
        const snap = await getDocs(query(collection(db, "questionBank"), where("teacherId", "==", fbUser.uid), limit(50)));
        setBankQuestions(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch(e) {}
      setLoadBank(false);
    };
    fetchBank();
  }, [showQB, fbUser]);

  const handleImportBank = (bq) => {
    // Add to current questions list
    const newQList = [...questions, { question: bq.question, options: bq.options, answerIndex: bq.answerIndex, explanation: bq.explanation || "" }];
    updateQuestion(currentQIndex, newQList[questions.length]); // Wait, this doesn't work. We need setQuestions from parent.
    // Instead of messing with setQuestions directly here, we use addQuestion and update the newly added one.
    // However, `updateQuestion` only works if the question is already added and re-rendered.
    // To properly import:
    const newQuestions = [...questions];
    if (newQuestions[currentQIndex] && !newQuestions[currentQIndex].question.trim() && newQuestions[currentQIndex].options.every(o => !o.trim())) {
      // overwrite empty current
      newQuestions[currentQIndex] = { ...bq };
    } else {
      newQuestions.push({ ...bq });
      setCurrentQIndex(newQuestions.length - 1);
    }
    setForm(f => f); // hack to not need setQuestions explicitly if we passed it.
    // Actually, we must change CreateQuizSection props to expose `setQuestions`. Let's just patch `setQuestions` via python.
  };
"""

create_quiz_props_old = r"form, setForm, questions, addQuestion, removeQuestion,"
create_quiz_props_new = r"form, setForm, questions, setQuestions, addQuestion, removeQuestion,"
code = re.sub(create_quiz_props_old, create_quiz_props_new, code)

# Let's fix handleImportBank properly using setQuestions
question_bank_impl = """
  const [showQB, setShowQB] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [loadBank, setLoadBank] = useState(false);

  useEffect(() => {
    if (!showQB || !profile?.uid || bankQuestions.length > 0) return;
    const fetchBank = async () => {
      setLoadBank(true);
      try {
        const snap = await getDocs(query(collection(db, "questionBank"), where("teacherId", "==", profile.uid), limit(50)));
        setBankQuestions(snap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch(e) {}
      setLoadBank(false);
    };
    fetchBank();
  }, [showQB, profile]);

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
"""

cg_index_old = r"  const \[currentQIndex, setCurrentQIndex\] = useState\(0\);"
if "const [showQB" not in code:
   code = re.sub(cg_index_old, "  const [currentQIndex, setCurrentQIndex] = useState(0);\n" + question_bank_impl, code)

# Add "Open Question Bank" Button next to "+ Add Q" button
add_q_old = r"""              <div className="flex justify-between items-end">
                <div className="text-xl font-bold text-indigo-400">Question \{currentQIndex \+ 1\} <span className="text-gray-500 text-sm">/ \{questions\.length\}</span></div>
                <div className="flex gap-2">
                  <button disabled=\{questions\.length <= 1\} onClick=\{handleRemove\} className="px-3 py-1\.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold disabled:opacity-30 transition-all">Remove</button>
                </div>
              </div>"""

add_q_new = """              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                <div className="text-xl font-bold text-indigo-400">Question {currentQIndex + 1} <span className="text-gray-500 text-sm">/ {questions.length}</span></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setShowQB(true)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600 text-xs font-bold transition-all">Import from Bank</button>
                  <button disabled={questions.length <= 1} onClick={handleRemove} className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs font-bold disabled:opacity-30 transition-all">Remove</button>
                </div>
              </div>"""

code = code.replace(re.search(add_q_old, code).group(0), add_q_new)


qb_modal = """
      {/* Question Bank Slide-over Modal */}
      {showQB && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm" onClick={() => setShowQB(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border-l border-gray-800 shadow-2xl h-full flex flex-col transform transition-transform animate-[slideInRight_0.3s_ease]">
             <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
               <h3 className="text-lg font-bold text-gray-100">Question Bank</h3>
               <button onClick={() => setShowQB(false)} className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg">✕</button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/50">
               {loadBank ? (
                  <div className="text-center text-gray-500 text-sm mt-10">Loading your saved questions...</div>
               ) : bankQuestions.length === 0 ? (
                  <div className="text-center border border-dashed border-gray-700 bg-gray-800/30 rounded-2xl p-8">
                     <div className="text-3xl mb-3 opacity-50">📂</div>
                     <div className="text-gray-400 text-sm">Your question bank is empty. When you publish quizzes, their questions will be stored here for easy reuse!</div>
                  </div>
               ) : (
                  bankQuestions.map(bq => (
                     <div key={bq.id} className="p-4 rounded-xl border border-gray-800 bg-gray-800/40 hover:bg-gray-800 transition-colors group">
                        <div className="text-sm font-bold text-gray-200 mb-2 line-clamp-2">{bq.question}</div>
                        <div className="flex justify-between items-center">
                           <div className="text-xs text-indigo-400 font-medium">{bq.department || "General"}</div>
                           <button onClick={() => handleImportBank(bq)} className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Add</button>
                        </div>
                     </div>
                  ))
               )}
             </div>
          </div>
        </div>
      )}"""

# Insert `qb_modal` at the end of the return statement of CreateQuizSection
close_section = r"    </Section>\n  \);"
code = re.sub(close_section, qb_modal + "\n    </Section>\n  );", code)

# Expose `setQuestions` down to `CreateQuizSection` from `TeacherDashboard`
props_inject_old = r"""              saveStatus=\{saveStatus\}
              form=\{form\} setForm=\{setForm\} questions=\{questions\} addQuestion=\{addQuestion\} removeQuestion=\{removeQuestion\}"""
props_inject_new = """              saveStatus={saveStatus}
              form={form} setForm={setForm} questions={questions} setQuestions={setQuestions} addQuestion={addQuestion} removeQuestion={removeQuestion}"""
code = re.sub(props_inject_old, props_inject_new, code)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("done phase 3 backend refactor.")
