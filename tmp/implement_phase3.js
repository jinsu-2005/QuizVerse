import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Student/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add uniqueQuizHistory memo
const statsLine = 'const quizStats = useMemo(()'; // start of previous memo
const uniqueHistoryMemo = `
  const uniqueQuizHistory = useMemo(() => {
    const map = {};
    // attempts are sorted desc by completedAt
    attempts.forEach(a => {
      const qid = a.quizId;
      const score = a.total > 0 ? a.score / a.total : 0;
      if (!map[qid]) {
        map[qid] = {
          quizTitle: a.quizTitle || "Untitled Quiz",
          quizId: a.quizId,
          bestScore: score,
          bestAttemptId: a.id,
          latestScore: score,
          latestAttemptId: a.id,
          latestDate: a.completedAt,
          totalAttempts: 0
        };
      }
      map[qid].totalAttempts++;
      if (score > map[qid].bestScore) {
        map[qid].bestScore = score;
        map[qid].bestAttemptId = a.id;
      }
    });
    return Object.values(map);
  }, [attempts]);
`;
content = content.replace(statsLine, uniqueHistoryMemo + '\n  ' + statsLine);

// 2. Replace the Recent Attempts UI
const oldRecentAttempts = `<Section title="Recent Attempts">
        {attempts.length === 0 ? (
          <Empty text="You haven't attempted any quiz yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {attempts.slice(0, 8).map((a, i) => (
              <div 
                key={a.id} 
                className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5 flex flex-col transition-all hover:translate-y-[-2px] hover:border-indigo-500/30 hover:shadow-[0_8px_30px_-10px_rgba(79,70,229,0.3)] animate-[fadeInUp_500ms_ease_forwards]"
                style={{ animationDelay: \`\${i * 100}ms\` }}
              >
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-gray-200 line-clamp-2 leading-snug">{a.quizTitle || a.quizId}</h4>
                </div>
                
                <div className="my-auto space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Score</span>
                    <span className={\`font-bold \${
                      a.score / a.total >= 0.8 ? 'text-green-400' : 
                      a.score / a.total >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                    }\`}>
                      {a.score}/{a.total} ({Math.round((a.score / a.total) * 100)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Date</span>
                    <span className="text-gray-300">{formatDate(a.completedAt)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => nav(\`/result/\${a.id}\`)}
                  className="mt-4 w-full rounded-xl border border-indigo-500/50 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white px-3 py-2 text-sm font-semibold text-indigo-300 transition-colors"
                >
                  View Details
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>`;

const newRecentAttempts = `<Section title="Performance History">
        {uniqueQuizHistory.length === 0 ? (
          <Empty text="Your quiz attempts will appear here." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {uniqueQuizHistory.map((h, i) => (
              <div 
                key={h.quizId} 
                className="rounded-2xl border border-gray-800/80 bg-gray-900/60 p-5 flex flex-col transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl group"
              >
                <div className="flex flex-col gap-1 mb-4">
                  <h4 className="font-bold text-gray-100 group-hover:text-indigo-300 transition-colors line-clamp-1">{h.quizTitle}</h4>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{h.totalAttempts} Attempt{h.totalAttempts !== 1 ? 's' : ''} total</div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-xl bg-gray-950/40 border border-gray-800/80 p-3 text-center">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-400/80 mb-1">Latest</div>
                    <div className={\`text-lg font-black \${h.latestScore >= 0.8 ? 'text-green-400' : h.latestScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'}\`}>
                      {Math.round(h.latestScore * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-950/40 border border-indigo-500/20 p-3 text-center ring-1 ring-indigo-500/20">
                    <div className="text-[9px] font-black uppercase tracking-tighter text-indigo-400 mb-1">Best</div>
                    <div className={\`text-lg font-black \${h.bestScore >= 0.8 ? 'text-green-400' : h.bestScore >= 0.5 ? 'text-yellow-400' : 'text-red-400'}\`}>
                      {Math.round(h.bestScore * 100)}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 mb-4 px-1">
                  <span>Last taken:</span>
                  <span className="font-semibold text-gray-400">{formatDate(h.latestDate)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => nav(\`/result/\${h.latestAttemptId}\`)}
                    className="flex-1 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 text-xs font-bold transition-colors border border-gray-700"
                  >
                    Latest
                  </button>
                  <button
                    onClick={() => nav(\`/result/\${h.bestAttemptId}\`)}
                    className="flex-1 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-2 text-xs font-bold transition-all border border-indigo-500/30"
                  >
                    Best
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>`;

content = content.replace(oldRecentAttempts, newRecentAttempts);

fs.writeFileSync(file, content);
console.log('Performance History refined with unique quiz cards and best/latest metrics.');
