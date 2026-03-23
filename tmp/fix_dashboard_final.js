import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split(/\r?\n/);

// SelectSmall ends at 1751 in the last view. Check:
// 1750:   );
// 1751: }
const part1 = lines.slice(0, 1752).join('\n'); 

const fixedPart = `
function Empty({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/40 p-10 text-center">
      <div className="mx-auto mb-3 text-3xl opacity-30">📋</div>
      <div className="text-gray-400 text-sm font-medium">{text}</div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-3 w-16 bg-gray-800 rounded-full" />
        <div className="h-3 w-12 bg-gray-800 rounded-full" />
      </div>
      <div className="h-5 w-2/5 bg-gray-800 rounded" />
      <div className="mt-3 h-3 w-3/4 bg-gray-800 rounded" />
    </div>
  );
}

function QuizRow({ quiz, onDelete, onDuplicate, onEdit }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });

  const loadStats = async () => {
    setStats((s) => ({ ...s, loading: true }));
    try {
      const qRef = query(
        collection(db, "quizAttempts"),
        where("quizId", "==", quiz.id),
        orderBy("completedAt", "desc")
      );
      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => d.data());

      if (!rows.length) {
        setStats({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });
        return;
      }

      const count = rows.length;
      const pcts = rows.map((r) => (r.total ? Math.round((r.score / r.total) * 100) : 0));
      const avg = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
      const best = Math.max(...pcts);
      const last = rows[0]?.completedAt || null;
      setStats({ loading: false, count, avg, best, last, error: null });
    } catch (e) {
      console.error("Stats error:", e);
      let errorMsg = "Could not load data: " + (e.code || e.message || "Unknown error");
      if (e.code === "permission-denied") {
        errorMsg = "Unauthorized. Check your Firestore rules.";
      } else if (e.code?.toString().includes("index") || e.message?.toLowerCase().includes("index")) {
        errorMsg = "Index required. See console for setup link.";
      }
      setStats({ loading: false, count, avg, best, last, error: errorMsg });
    }
  };

  const handleToggle = () => {
    setOpen((o) => !o);
    if (!open) loadStats();
  };

  return (
    <div className="group rounded-2xl border border-gray-800/80 bg-gray-900/60 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-[0_8px_30px_-10px_rgba(79,70,229,0.25)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 relative z-10">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="rounded-md border border-gray-700/80 bg-gray-800/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
              {quiz.department} • {quiz.academicYear}
            </span>
            {quiz.sourceMode && (
              <span className="flex items-center gap-1 rounded-md border border-indigo-700/50 bg-indigo-900/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {quiz.sourceMode === "custom" ? "Custom" : "AI Generated"}
              </span>
            )}
            {quiz.difficulty && (
              <span className={\`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider \${quiz.difficulty === "Easy" ? "border-green-500/30 bg-green-500/10 text-green-400" :
                quiz.difficulty === "Hard" ? "border-red-500/30 bg-red-500/10 text-red-400" :
                  "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                }\`}>
                {quiz.difficulty}
              </span>
            )}
          </div>

          <h3 className="text-xl font-bold text-gray-100 group-hover:text-indigo-300 transition-colors leading-tight mb-1">
            {quiz.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 md:line-clamp-1 mb-2 pr-4">{quiz.description || "—"}</p>

          <div className="flex items-center gap-3 text-xs text-gray-500 font-medium tracking-wide">
            <span>Created {fmtDate(quiz.createdAt)}</span>
            <span>•</span>
            <span>{quiz.questions?.length || 0} Questions</span>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-950/50 p-1 rounded-xl border border-gray-800/80">
              <button
                onClick={() => onEdit(quiz)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                title="Edit Quiz"
              >
                Edit
              </button>
              <button
                onClick={() => onDuplicate(quiz)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-800 hover:text-gray-200 transition-colors"
                title="Duplicate"
              >
                Duplicate
              </button>
              <button
                onClick={() => onDelete(quiz.id)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-red-900/40 hover:text-red-400 transition-colors"
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
          <button
            onClick={handleToggle}
            className={\`rounded-xl px-5 py-2.5 text-sm font-bold shadow-lg transition-all hover:scale-105 active:scale-95 \${open
              ? "bg-gray-800 border border-gray-700 text-white shadow-none"
              : "bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 text-white shadow-indigo-900/30"
              }\`}
            title="Toggle analytics"
          >
            {open ? "Hide Stats" : "View Analytics"}
          </button>
        </div>
      </div>

      {/* Body (analytics) */}
      <div
        className={\`grid transition-all duration-300 ease-in-out \${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }\`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-800/80 bg-gray-900/40 p-5 grid sm:grid-cols-4 gap-4 relative z-10">
            {stats.loading ? (
              <>
                <SkeletonChip />
                <SkeletonChip />
                <SkeletonChip />
                <SkeletonChip />
              </>
            ) : stats.error ? (
              <div className="sm:col-span-4 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-center">
                <div className="text-red-400 font-bold mb-1">Analytics Error</div>
                <div className="text-red-300/70 text-sm">{stats.error}</div>
              </div>
            ) : (
              <>
                <KPI label="Attempts" value={String(stats.count)} />
                <KPI label="Average" value={\`\${stats.avg}%\`} />
                <KPI label="Best" value={\`\${stats.best}%\`} />
                <KPI label="Last Attempt" value={fmtDate(stats.last) || "—"} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`;

const part4Lines = lines.slice(lines.findIndex(l => l.includes('function KPI')));
const part4 = part4Lines.join('\n');

fs.writeFileSync(file, part1 + fixedPart + part4);
console.log('Successfully reconstructed file.');
