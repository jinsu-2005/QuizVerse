import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const marker = '/* -------------------------------- CUSTOM QUIZ SECTION -------------------------------- */';
const parts = content.split(marker);

if (parts.length > 1) {
    const sectionAfter = parts[1];
    // Find the NEXT return (Section title="Create Custom Quiz">)
    const returnIdx = sectionAfter.indexOf('return (');
    if (returnIdx !== -1) {
        const header = `

function CustomQuizSection({
  form, setForm, questions, addQuestion, removeQuestion,
  updateQuestion, updateOption, createQuiz, busyCreate, profile,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts
}) {
`;
        content = parts[0] + marker + header + sectionAfter.slice(returnIdx);
        fs.writeFileSync(file, content);
        console.log('CustomQuizSection props definition fixed.');
    } else {
        console.error('Return not found.');
    }
} else {
    console.error('Marker not found.');
}
