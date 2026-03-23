import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetStart = '{/* Settings Row */}';
const targetEnd = '</div>'; // The </div> after NumberField Limit Attempts
const aiSectionStartIdx = content.indexOf('function AiQuizSection');
const relativeStartIdx = content.indexOf(targetStart, aiSectionStartIdx);
const relativeEndIdx = content.indexOf(targetEnd, relativeStartIdx + targetStart.length);

// I need to find the correct ending </div>. 
// It was <div className="grid ..."> ... </div>.
// So targetEnd should be the first </div> after the last NumberField.

// Actually I'll just replace the whole Settings Row block.
const oldBlock = `            {/* Settings Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <NumberField
                label="(1–100) Questions"
                value={numQuestions}
                onChange={(v) => setNumQuestions(v)}
                onBlur={() => setNumQuestions(clampedNumQ(numQuestions))}
                min={1} max={100}
              />
              <NumberField
                label="Options (2–10)"
                value={numOptions}
                onChange={(v) => setNumOptions(v)}
                onBlur={() => setNumOptions(clampedNumOpt(numOptions))}
                min={2} max={10}
              />
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
            </div>`;

const newBlock = `            {/* Settings Layout Refactor */}
            <div className="flex flex-col gap-5">
              {/* Row 1: Core Params */}
              <div className="grid grid-cols-2 gap-5">
                <NumberField
                  label="Questions (1–100)"
                  value={numQuestions}
                  onChange={(v) => setNumQuestions(v)}
                  onBlur={() => setNumQuestions(clampedNumQ(numQuestions))}
                  min={1} max={100}
                />
                <NumberField
                  label="Options (2–10)"
                  value={numOptions}
                  onChange={(v) => setNumOptions(v)}
                  onBlur={() => setNumOptions(clampedNumOpt(numOptions))}
                  min={2} max={10}
                />
              </div>

              {/* Row 2: Logic & Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={["Easy", "Moderate", "Hard"]}
                />
                <NumberField
                  label="Limit Attempts (0 to ∞)"
                  value={maxAttempts}
                  onChange={(v) => setMaxAttempts(v)}
                  onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
                  min={0} max={50}
                />
              </div>
            </div>`;

if (content.indexOf(oldBlock) !== -1) {
    content = content.replace(oldBlock, newBlock);
    fs.writeFileSync(file, content);
    console.log('AI Quiz Forge layout refactored.');
} else {
    // If exact match fails due to whitespace differences from previous edits
    console.warn('Exact match failed. Trying flexible approach.');
    const startIdx = content.indexOf('{/* Settings Row */}');
    const endMarker = 'min={0} max={50}';
    const endIdx = content.indexOf('/>', content.indexOf(endMarker, startIdx));
    if (startIdx !== -1 && endIdx !== -1) {
        // Find the </div> enclosing it
        const divEndIdx = content.indexOf('</div>', endIdx);
        content = content.slice(0, startIdx) + newBlock + content.slice(divEndIdx + 6);
        fs.writeFileSync(file, content);
        console.log('AI Quiz Forge layout refactored (flexible match).');
    } else {
        console.error('Settings Row block not found.');
    }
}
