const fs = require('fs');
const filePath = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const replacement = `
/* ------------------------------- QUIZ ROW UI ------------------------------ */

function QuizRow({ quiz, onDelete, onDuplicate, onEdit }) {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });

  const loadStats = async () => {
    setStats((s) => ({ ...s, loading: true }));
    try {
      const qRef = query(
        collection(db, "quizAttempts"),
        where("quizId", "==", quiz.id),
        orderBy("completedAt", "desc")
      );
      const snap = await getDocs(qRef);
      const rows = snap.docs.map((d) => d.data());

      if (!rows.length) {
        setStats({ loading: false, count: 0, avg: 0, best: 0, last: null, error: null });
        return;
      }

      const count = rows.length;
      const pcts = rows.map((r) => (r.total ? Math.round((r.score / r.total) * 100) : 0));
      const avg = Math.round(pcts.reduce((s, x) => s + x, 0) / pcts.length);
      const best = Math.max(...pcts);
      const last = rows[0]?.completedAt || null;
      setStats({ loading: false, count, avg, best, last, error: null });
    } catch (e) {
      console.error("Stats error:", e);
      let errorMsg = "Could not load data: " + (e.code || e.message || "Unknown error");
      if (e.code === "permission-denied") {
        errorMsg = "Unauthorized. Check your Firestore rules.";
      } else if (e.code?.toString().includes("index") || e.message?.toLowerCase().includes("index")) {
        errorMsg = "Index required. See console for setup link.";
      }
      setStats({ loading: false, count, avg, best, last, error: errorMsg });
    }
  };
`;

const lines = content.split(/\r?\n/);
let startLine = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function RowSkeleton()')) {
        for (let j = i; j < lines.length; j++) {
            if (lines[j].trim() === '}') {
                startLine = j + 1;
                break;
            }
        }
        break;
    }
}

let endLine = -1;
for (let i = startLine; i < lines.length; i++) {
    if (lines[i].includes('const handleToggle = () => {')) {
        endLine = i;
        break;
    }
}

if (startLine !== -1 && endLine !== -1) {
    const newLines = lines.slice(0, startLine).concat([replacement]).concat(lines.slice(endLine));
    fs.writeFileSync(filePath, newLines.join('\n'));
    console.log('Fixed lines ' + startLine + ' to ' + endLine);
} else {
    console.error('Markers not found', { startLine, endLine });
}
