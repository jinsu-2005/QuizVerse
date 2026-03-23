const fs = require('fs');

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const marker = '{/* Settings Layout Refactor */}';
const parts = content.split(marker);

if (parts.length > 1) {
    const after = parts[1];
    const endMarker = 'min={0} max={50}';
    const relativeEndIdx = after.indexOf('/>', after.indexOf(endMarker));
    const divEndIdx = after.indexOf('</div>', relativeEndIdx);
    
    // The new block
    const newBlock = `
            <div className="flex flex-col gap-6">
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

              {/* Row 2: Logic - Full Width */}
              <Select
                label="Difficulty"
                value={difficulty}
                onChange={setDifficulty}
                options={["Easy", "Moderate", "Hard"]}
              />
              
              {/* Row 3: Limit - Full Width */}
              <NumberField
                label="Limit Attempts (0 to ∞)"
                value={maxAttempts}
                onChange={(v) => setMaxAttempts(v)}
                onBlur={() => setMaxAttempts(Math.min(50, Math.max(0, Number(maxAttempts || 0))))}
                min={0} max={50}
              />
            </div>
`;
    // We want to replace from marker to the end of the flex-col div.
    // The previous code had a few </div>.
    // I'll take current parts[0] + marker + newBlock + after.slice(divEndIdx + 6)
    content = parts[0] + marker + newBlock + after.slice(divEndIdx + 6);
    fs.writeFileSync(file, content);
    console.log('UI Refactor complete with CJS.');
} else {
    console.error('Marker not found.');
}
