import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
const content = fs.readFileSync(file, 'utf8');

const targetHeader = '/* ------------------------------- MAIN SCREEN ------------------------------ */';
const newConstants = `
const ACADEMIC_YEARS = ["2022 - 2026", "2023 - 2027", "2024 - 2028", "2025 - 2029"];
const MIN_Q = 1, MAX_Q = 100;
const MIN_OPT = 2, MAX_OPT = 10;
const MIN_ATTEMPTS = 0, MAX_ATTEMPTS = 50;
`;

// Find the export default function TeacherDashboard line and put constants before it.
const searchStr = 'export default function TeacherDashboard() {';
const index = content.indexOf(searchStr);

if (index !== -1) {
    // Also add the state inside the function
    const stateStr = 'const [createMode, setCreateMode] = useState("custom");';
    const stateInsert = '\n  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Unlimited';
    
    let newContent = content.slice(0, index) + newConstants + '\n' + content.slice(index);
    
    // Add state
    newContent = newContent.replace(stateStr, stateStr + stateInsert);
    
    fs.writeFileSync(file, newContent);
    console.log('Constants and maxAttempts state added.');
} else {
    console.error('TeacherDashboard function not found.');
}
