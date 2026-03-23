import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetHeader = '{/* Row 2: Logic & Limits */}';
const targetStart = '<div className="grid grid-cols-1 sm:grid-cols-2 gap-5">';

// I'll replace everything from '{/* Settings Layout Refactor */}' to the end of Row 2.
const startMarker = '{/* Settings Layout Refactor */}';
const sectionAfterMarker = content.split(startMarker)[1];
const firstDivAfter = sectionAfterMarker.indexOf('<div className="flex flex-col gap-5">');
const endMarker = 'min={0} max={50}';
const relativeEndIdx = sectionAfterMarker.indexOf('/>', sectionAfterMarker.indexOf(endMarker));
const divEndIdx = sectionAfterMarker.indexOf('</div>', relativeEndIdx);
// Find the 2nd </div> if needed, but flex-col only has one main wrapper
// Wait, the grid also needs closing </div>.

const newContent = \`
            {/* Settings Layout Refactor */}
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

              {/* Row 2: Separate Full-Width Logic Fields */}
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
\`;

// Replace from startMarker to the end of the flex-col div
content = content.split(startMarker)[0] + newContent + sectionAfterMarker.slice(divEndIdx + 6);

fs.writeFileSync(file, content);
console.log('AI Quiz Forge layout refactored to stacked logic fields.');
