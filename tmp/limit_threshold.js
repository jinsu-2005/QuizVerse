import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update global constants
content = content.replace('const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 50;', 'const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 5;');

// 2. Update AI Forge onBlur and max prop
const oldAiAttemptsStr = 'onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}\n                min={0} max={50}';
const newAiAttemptsStr = 'onBlur={() => setMaxAttempts(Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Number(maxAttempts || 0))))}\n                min={MIN_ATTEMPTS} max={MAX_ATTEMPTS}';

// Since the string above might have varying whitespace, I'll use regex.
content = content.replace(
    /onBlur=\{([^}]*?Math\.min\(50, Math\.max\(0, Number\(maxAttempts \|\| 0\)\)\)[^}]*?)\}\s+min=\{0\} max=\{50\}/g,
    'onBlur={(v) => setMaxAttempts(Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Number(maxAttempts || 0))))} min={MIN_ATTEMPTS} max={MAX_ATTEMPTS}'
);

// 3. Update Custom Forge (line-based since it's cleaner)
const customMatch = 'Math.min(50, Math.max(0, Number(maxAttempts || 0)))';
const customReplacement = 'Math.min(MAX_ATTEMPTS, Math.max(MIN_ATTEMPTS, Number(maxAttempts || 0)))';
content = content.split(customMatch).join(customReplacement);

// 4. Update the literal max props
content = content.split('max={50}').join('max={MAX_ATTEMPTS}');
content = content.split('min={0}').join('min={MIN_ATTEMPTS}');

fs.writeFileSync(file, content);
console.log('Attempt limit threshold updated to 0-5 (0=Unlimited).');
