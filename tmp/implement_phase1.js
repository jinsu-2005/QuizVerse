import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update component calls in TeacherDashboard
content = content.replace(
    'generateWithAI={generateWithAI}',
    'generateWithAI={generateWithAI}\n              maxAttempts={maxAttempts}\n              setMaxAttempts={setMaxAttempts}'
);
content = content.replace(
    'setTimeValue={setTimeValue}',
    'setTimeValue={setTimeValue}\n              maxAttempts={maxAttempts}\n              setMaxAttempts={setMaxAttempts}'
);

// 2. Update publishAiQuiz payload
content = content.replace(
    'sourceMode: aiQuiz.meta.sourceMode,',
    'sourceMode: aiQuiz.meta.sourceMode,\n        maxAttempts: Number(maxAttempts) || 0,'
);

// 3. Update createQuiz payload
content = content.replace(
    'sourceMode: "custom",',
    'sourceMode: "custom",\n        maxAttempts: Number(maxAttempts) || 0,'
);
// Reset state after create
content = content.replace(
    'setQuestions([',
    'setMaxAttempts(0);\n      setQuestions(['
);

// 4. Update editQuiz to populate maxAttempts
content = content.replace(
    'setTimeValue(quiz.timer?.time || (quiz.timer?.mode === "total" ? 10 : 30));',
    'setTimeValue(quiz.timer?.time || (quiz.timer?.mode === "total" ? 10 : 30));\n    setMaxAttempts(quiz.maxAttempts || 0);'
);

// 5. Update updateExistingQuiz payload
content = content.replace(
    'updatedAt: serverTimestamp(),',
    'maxAttempts: Number(maxAttempts) || 0,\n        updatedAt: serverTimestamp(),'
);

// 6. Update AiQuizSection definition and UI
content = content.replace(
    'clampedNumQ, clampedNumOpt',
    'clampedNumQ, clampedNumOpt, maxAttempts, setMaxAttempts'
);
content = content.replace(
    'options={["Easy", "Moderate", "Hard"]}',
    'options={["Easy", "Moderate", "Hard"]}\n              />\n              <NumberField\n                label="Limit Attempts (0=∞)"\n                value={maxAttempts}\n                onChange={(v) => setMaxAttempts(v)}\n                onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}\n                min={0} max={50}'
);

// 7. Update CustomQuizSection definition and UI
content = content.replace(
    'timeValue, setTimeValue',
    'timeValue, setTimeValue, maxAttempts, setMaxAttempts'
);
content = content.replace(
    'options={["Easy", "Moderate", "Hard"]}',
    'options={["Easy", "Moderate", "Hard"]}\n            />\n            <NumberField\n              label="Limit Attempts (0=∞)"\n              value={maxAttempts}\n              onChange={(v) => setMaxAttempts(v)}\n              onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}\n              min={0} max={50}'
);

// 8. Update loadStats in QuizRow for "Best Attempt per Student"
const oldLoadStats = `      const count = rows.length;
      const pcts = rows.map((r) => (r.total ? Math.round((r.score / r.total) * 100) : 0));
      const avg = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
      const best = Math.max(...pcts);`;

const newLoadStats = `      // Group by studentId and take BEST score per student for clearer analytics
      const userBestMap = {};
      rows.forEach(r => {
        const pct = r.total ? Math.round((r.score / r.total) * 100) : 0;
        if (!userBestMap[r.studentId] || pct > userBestMap[r.studentId]) {
          userBestMap[r.studentId] = pct;
        }
      });

      const uniqueStudentPcts = Object.values(userBestMap);
      const count = uniqueStudentPcts.length;
      const avg = count ? Math.round(uniqueStudentPcts.reduce((s, x) => s + x, 0) / count) : 0;
      const best = uniqueStudentPcts.length ? Math.max(...uniqueStudentPcts) : 0;`;

content = content.replace(oldLoadStats, newLoadStats);

fs.writeFileSync(file, content);
console.log('Teacher Dashboard updated with maxAttempts setting and best-attempt analytics.');
