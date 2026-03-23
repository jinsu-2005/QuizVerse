import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const anchor = 'Limit Attempts (0 to ∞)';
const afterAnchor = content.indexOf(anchor);
const endCompIdx = content.indexOf('/>', afterAnchor);
const nextDivIdx = content.indexOf('</div>', endCompIdx);

// The goal is to have:
// </div> (end of my flex-col)
// <div> (start of timer block)
// <label>Timer</label>

const timerMarker = '<label className="mb-2.5 block text-xs font-bold uppercase tracking-wider text-gray-300">Timer</label>';
const timerIdx = content.indexOf(timerMarker);

if (nextDivIdx !== -1 && timerIdx !== -1) {
    const header = \`
            </div>

            <div>
\`;
    content = content.slice(0, nextDivIdx + 6) + header + content.slice(timerIdx);
    fs.writeFileSync(file, content);
    console.log('JSX structure around Timer stabilized.');
} else {
    console.error('Markers not found.');
}
