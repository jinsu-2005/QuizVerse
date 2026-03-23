import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const badLine = 'const [timeValue, setTimeValue, maxAttempts, setMaxAttempts] = useState(30); // seconds (perQ) or minutes (total)';
const goodLine = 'const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)';

if (content.includes(badLine)) {
    content = content.replace(badLine, goodLine);
    fs.writeFileSync(file, content);
    console.log('Duplicate state in timeValue fixed.');
} else {
    // If it was already deleted by the previous bad replace, let's restore the whole block.
    // I see the previous replace did DELETE the whole block (lines 71-91 roughly).
    console.error('Line not found. Restoring whole state block.');
    
    const insertionPoint = '// Mode switching';
    const stateBlock = `
  const [createMode, setCreateMode] = useState("custom"); // "ai" or "custom"
  const [maxAttempts, setMaxAttempts] = useState(0); // 0 = Unlimited
  
  // AI Quiz Generation state
  const [aiMode, setAiMode] = useState("topic"); // 'topic' | 'file'
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [instruction, setInstruction] = useState("Create a multiple-choice quiz based on the provided text.");
  const [numQuestions, setNumQuestions] = useState(10);
  const [numOptions, setNumOptions] = useState(4);
  const [difficulty, setDifficulty] = useState("Moderate");
  const [timerMode, setTimerMode] = useState("off"); // 'off' | 'perQuestion' | 'total'
  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)
    `;

    // Find the place after '// Mode switching'
    const index = content.indexOf(insertionPoint);
    if (index !== -1) {
        const nextPart = content.slice(index + insertionPoint.length);
        content = content.slice(0, index + insertionPoint.length) + stateBlock + nextPart;
        fs.writeFileSync(file, content);
        console.log('State block restored correctly.');
    } else {
        console.error('Mode switching comment not found.');
    }
}
