import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Student/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// The file is broken around line 161.
// Let's find the start of uniqueQuizHistory and the start of quizStats and fix the gap.

const startMarker = 'const uniqueQuizHistory = useMemo(() => {';
const endMarker = 'const quizStats = useMemo(() => {';

const split1 = content.split(startMarker);
if (split1.length < 2) {
    console.error('Start marker not found');
    process.exit(1);
}

const split2 = split1[1].split(endMarker);
if (split2.length < 2) {
    console.error('End marker not found');
    process.exit(1);
}

const newMemoContent = `
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
    return Object.values(map).sort((a,b) => {
        const da = a.latestDate?.toMillis?.() || new Date(a.latestDate).getTime() || 0;
        const db = b.latestDate?.toMillis?.() || new Date(b.latestDate).getTime() || 0;
        return db - da;
    });
  }, [attempts]);

  `;

const finalContent = split1[0] + startMarker + newMemoContent + endMarker + split2[1];

fs.writeFileSync(file, finalContent);
console.log('Student Dashboard fixed and sorted.');
