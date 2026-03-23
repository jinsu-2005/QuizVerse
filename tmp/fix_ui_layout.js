import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix AiQuizSection: Remove duplicate and expand grid
content = content.replace(
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-5">',
    '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">'
);

const aiDuplicate = `<NumberField
              label="Limit Attempts (0=∞)"
              value={maxAttempts}
              onChange={(v) => setMaxAttempts(v)}
              onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
              min={0} max={50}
              />
              <NumberField
                label="Limit Attempts (0=∞)"
                value={maxAttempts}
                onChange={(v) => setMaxAttempts(v)}
                onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
                min={0} max={50}
              />`;

const aiCorrect = `              <NumberField
                label="Limit Attempts (0=∞)"
                value={maxAttempts}
                onChange={(v) => setMaxAttempts(v)}
                onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
                min={0} max={50}
              />`;

content = content.replace(aiDuplicate, aiCorrect);

// 2. Fix CustomQuizSection: Add missing Limit Attempts
// We'll add it next to Difficulty in the grid.
const customDifficultySelect = `<Select
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={["Easy", "Moderate", "Hard"]}
            />`;

const customDifficultyWithAttempts = `
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={["Easy", "Moderate", "Hard"]}
            />
            <NumberField
              label="Limit Attempts (0=∞)"
              value={maxAttempts}
              onChange={(v) => setMaxAttempts(v)}
              onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
              min={0} max={50}
            />
`;

content = content.replace(customDifficultySelect, customDifficultyWithAttempts);
// Also adjust Custom grid to fit 3 items if needed, but it currently has Timer which is a big block.
// Let's change <div className="grid sm:grid-cols-2 gap-6"> to 3 for Custom too if it makes sense.
// Actually Custom has Timer as a separate DIV inside the same grid.

content = content.replace(
    '<div className="grid sm:grid-cols-2 gap-6">',
    '<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">'
);

fs.writeFileSync(file, content);
console.log('AI and Custom quiz sections updated. UI layout improved for attempt limits.');
