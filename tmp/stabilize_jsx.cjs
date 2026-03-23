const fs = require('fs');
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// The Goal:
// ... (Limit Attempts) />
// </div>
// <div>
// <label>Timer</label>

const anchor = 'Limit Attempts (0 to ∞)';
const anchorIdx = content.indexOf(anchor);
const endCompIdx = content.indexOf('/>', anchorIdx);

const timerMarker = '<label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Timer</label>';
const timerIdx = content.indexOf(timerMarker);

if (endCompIdx !== -1 && timerIdx !== -1) {
    const header = `
            </div>

            <div className="mt-2">
              `;
    content = content.slice(0, endCompIdx + 2) + header + content.slice(timerIdx);
    fs.writeFileSync(file, content);
    console.log('JSX structure around Timer stabilized (CJS).');
} else {
    console.error('Markers not found.');
}
