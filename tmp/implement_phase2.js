import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Student/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add quizStats computation using useMemo
const statsMemoLine = 'const stats = useMemo(() => computeStats(attempts), [attempts]);';
const quizStatsMemo = `
  const quizStats = useMemo(() => {
    const map = {};
    attempts.forEach(a => {
      const qid = a.quizId;
      const pct = a.total > 0 ? Math.round((a.score / a.total) * 100) : 0;
      if (!map[qid]) map[qid] = { best: 0, count: 0 };
      map[qid].count++;
      if (pct > map[qid].best) map[qid].best = pct;
    });
    return map;
  }, [attempts]);
`;
content = content.replace(statsMemoLine, statsMemoLine + quizStatsMemo);

// 2. Pass stats to QuizCard
content = content.replace(
    'quiz={qz}',
    'quiz={qz}\n                  stats={quizStats[qz.id]}'
);

// 3. Update QuizCard definition and UI
const oldQuizCard = `function QuizCard({ quiz, onStart, className = "", style = {} }) {
  const diffColor = 
    quiz.difficulty === "Easy" ? "text-green-400 border-green-500/30 bg-green-500/10" :
    quiz.difficulty === "Hard" ? "text-red-400 border-red-500/30 bg-red-500/10" :
    "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    
  const timeLabel = quiz.timer?.mode === "perQuestion" 
    ? \`\${quiz.timer.time}s / Q\` 
    : quiz.timer?.mode === "total" 
      ? \`\${quiz.timer.time}m total\` 
      : "Untimed";

  return (
    <div
      className={\`relative overflow-hidden group rounded-2xl border border-gray-800 bg-gray-900/70 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_10px_40px_-15px_rgba(79,70,229,0.5)] hover:border-indigo-500/50 \${className}\`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">{quiz.title}</h3>
          <p className="text-sm text-gray-400 line-clamp-2 mt-1">{quiz.description || "—"}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1 relative z-10">
        <span className="px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          {quiz.department} • {quiz.academicYear}
        </span>
        {quiz.difficulty && (
          <span className={\`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold \${diffColor}\`}>
            {quiz.difficulty}
          </span>
        )}
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {timeLabel}
        </span>
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-800/50 relative z-10">
        <span className="text-xs text-gray-400 font-medium">
          By {quiz.createdByName || quiz.createdBy?.slice(0, 6) || "Teacher"}
        </span>
        <button
          onClick={onStart}
          className="rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-white px-5 py-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}`;

const newQuizCard = `function QuizCard({ quiz, onStart, stats, className = "", style = {} }) {
  const attemptsMade = stats?.count || 0;
  const bestScore = stats?.best || 0;
  const maxAttempts = quiz.maxAttempts || 0;
  const isLimited = maxAttempts > 0 && attemptsMade >= maxAttempts;

  const diffColor = 
    quiz.difficulty === "Easy" ? "text-green-400 border-green-500/30 bg-green-500/10" :
    quiz.difficulty === "Hard" ? "text-red-400 border-red-500/30 bg-red-500/10" :
    "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
    
  const timeLabel = quiz.timer?.mode === "perQuestion" 
    ? \`\${quiz.timer.time}s / Q\` 
    : quiz.timer?.mode === "total" 
      ? \`\${quiz.timer.time}m total\` 
      : "Untimed";

  return (
    <div
      className={\`relative overflow-hidden group rounded-2xl border bg-gray-900/70 backdrop-blur-xl p-5 flex flex-col gap-3 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_10px_40px_-15px_rgba(79,70,229,0.5)] \${
        isLimited ? "border-red-900/30 grayscale-[0.5]" : "border-gray-800 hover:border-indigo-500/50"
      } \${className}\`}
      style={style}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
      
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">{quiz.title}</h3>
            {attemptsMade > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20">
                Best: {bestScore}%
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 line-clamp-2">{quiz.description || "—"}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 mt-1 relative z-10">
        <span className="px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          {quiz.department} • {quiz.academicYear}
        </span>
        {quiz.difficulty && (
          <span className={\`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold \${diffColor}\`}>
            {quiz.difficulty}
          </span>
        )}
        <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-800/80 border border-gray-700 text-[10px] uppercase tracking-wider font-semibold text-gray-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {timeLabel}
        </span>
        
        {maxAttempts > 0 && (
          <span className={\`px-2 py-1 rounded-md border text-[10px] uppercase tracking-wider font-semibold \${
            isLimited ? "bg-red-950/40 border-red-800/50 text-red-400" : "bg-gray-800/80 border-gray-700 text-gray-400"
          }\`}>
            {attemptsMade} / {maxAttempts} Attempts
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-800/50 relative z-10">
        <span className="text-xs text-gray-400 font-medium">
          By {quiz.createdByName || quiz.createdBy?.slice(0, 6) || "Teacher"}
        </span>
        
        {isLimited ? (
          <div className="flex items-center gap-2 text-[11px] font-bold text-red-400/80 bg-red-950/20 px-3 py-2 rounded-xl border border-red-900/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0110 0v4"></path></svg>
            Limit Reached
          </div>
        ) : (
          <button
            onClick={onStart}
            className="rounded-lg bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/20 text-white px-5 py-2 text-sm font-bold transition-all hover:scale-105 active:scale-95"
          >
            {attemptsMade > 0 ? "Retake Quiz" : "Start Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}`;

content = content.replace(oldQuizCard, newQuizCard);

fs.writeFileSync(file, content);
console.log('Student Dashboard updated with attempt tracking and limits.');
