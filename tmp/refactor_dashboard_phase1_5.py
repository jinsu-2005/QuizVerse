import re

filepath = r'c:\Users\jinsu\Documents\My Projects\Quiz-Verse\src\routes\Teacher\Dashboard.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Rename createMode to activeTab everywhere
code = re.sub(r'const \[createMode, setCreateMode\] = useState\("create"\);', 'const [activeTab, setActiveTab] = useState("home");', code)
code = code.replace("setCreateMode(", "setActiveTab(")
code = code.replace("createMode === ", "activeTab === ")
code = code.replace("createMode !== ", "activeTab !== ")
code = code.replace("activeTab={createMode}", "activeTab={activeTab}")
code = code.replace("onTabSelect={setCreateMode}", "onTabSelect={setActiveTab}")
code = code.replace("createMode, editingId", "activeTab, editingId")

# 2. Add Home, Quizzes, Analytics, Students to Sidebar menus (Desktop and Mobile)
sidebar_desktop_old = r"""          \{\[
            \{ key: "create", icon: "✨", label: "Create Quiz" \},
            \{ key: "requests", icon: "📋", label: "Student Requests", badge: requestsCount > 0 \? requestsCount : null \},
          \]"""

sidebar_desktop_new = """          {[
            { key: "home", icon: "🏠", label: "Dashboard" },
            { key: "quizzes", icon: "📚", label: "My Quizzes" },
            { key: "create", icon: "✨", label: "Create Quiz" },
            { key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 ? requestsCount : null },
            { key: "analytics", icon: "📈", label: "Analytics" },
            { key: "students", icon: "👥", label: "Students" },
          ]"""
code = re.sub(sidebar_desktop_old, sidebar_desktop_new, code)

sidebar_mobile_old = r"""            \{\[
              \{ key: "create", icon: "✨", label: "Create" \},
              \{ key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 \? requestsCount : null \},
            \]"""

sidebar_mobile_new = """            {[
              { key: "home", icon: "🏠", label: "Home" },
              { key: "quizzes", icon: "📚", label: "Quizzes" },
              { key: "create", icon: "✨", label: "Create" },
              { key: "requests", icon: "📋", label: "Requests", badge: requestsCount > 0 ? requestsCount : null },
              { key: "analytics", icon: "📈", label: "Data" },
            ]"""
code = re.sub(sidebar_mobile_old, sidebar_mobile_new, code)


# 3. Main layout logic change inside TeacherDashboard
main_render_old = r"""    <SidebarLayout 
      profile=\{profile\} fbUser=\{fbUser\} onOpenProfile=\{\(\) => setOpenProfile\(true\)\}
      activeTab=\{activeTab\} onTabSelect=\{setActiveTab\} requestsCount=\{requests\.length\}
    >
      <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full grid gap-8 lg:grid-cols-\[1fr_400px\]">
        <div>
          \{activeTab === "requests" \? \(
            <StudentRequestsSection requests=\{requests\} busyReqs=\{busyReqs\} />
          \) : \(
            <CreateQuizSection
              saveStatus=\{saveStatus\}
              form=\{form\} setForm=\{setForm\}([\s\S]*?)cancelEdit=\{cancelEdit\}
            />
          \)\}
        </div>

        \{\/\* Right Column - My Quizzes \*\/\}
        <Section title="My Quizzes">
          <QuizListSection([\s\S]*?)onEdit=\{editQuiz\}
          />
        </Section>
      </div>"""

main_render_new = r"""    <SidebarLayout 
      profile={profile} fbUser={fbUser} onOpenProfile={() => setOpenProfile(true)}
      activeTab={activeTab} onTabSelect={setActiveTab} requestsCount={requests.length}
    >
      <div className="w-full h-full">
        {activeTab === "home" && <PlaceholderView title="Dashboard Overview" icon="🏠" text="High-level metrics and active quiz summaries coming soon." />}
        {activeTab === "analytics" && <PlaceholderView title="Analytics & Reports" icon="📈" text="Macro-level student performance across all quizzes coming soon." />}
        {activeTab === "students" && <PlaceholderView title="Classes & Students" icon="👥" text="Cohort management and individual settings coming soon." />}
        
        {activeTab === "requests" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
            <StudentRequestsSection requests={requests} busyReqs={busyReqs} />
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="px-4 md:px-8 py-6 max-w-7xl mx-auto w-full">
            <Section title="My Quizzes">
              <QuizListSection\2onEdit={editQuiz}
              />
            </Section>
          </div>
        )}

        {activeTab === "create" && (
          <div className="px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
            <CreateQuizSection
              saveStatus={saveStatus}
              form={form} setForm={setForm}\1cancelEdit={cancelEdit}
            />
          </div>
        )}
      </div>"""

code = re.sub(main_render_old, main_render_new, code)


# 4. Add PlaceholderView component
placeholder_view = """
function PlaceholderView({ title, icon, text }) {
  return (
    <div className="px-4 md:px-8 py-10 max-w-5xl mx-auto w-full h-full flex flex-col pt-20">
      <Section title={title}>
         <div className="rounded-3xl border border-dashed border-gray-800 bg-gray-900/30 p-12 text-center flex flex-col items-center justify-center">
            <div className="text-6xl mb-6 opacity-80">{icon}</div>
            <h3 className="text-xl font-bold text-gray-200 mb-2">Work in Progress</h3>
            <p className="text-gray-500 max-w-md">{text}</p>
         </div>
      </Section>
    </div>
  );
}
"""

if "function PlaceholderView" not in code:
    code += placeholder_view


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("done phase 1.5 nav refactor.")
