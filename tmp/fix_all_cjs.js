const fs = require('fs');
const path = require('path');
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix state duplicates and errors
const lines = content.split('\n');
let foundMaxAttempts = false;
let cleanedLines = lines.filter(l => {
    if (l.includes('const [maxAttempts, setMaxAttempts] = useState(0);')) {
        if (foundMaxAttempts) return false;
        foundMaxAttempts = true;
    }
    return true;
}).map(l => {
    if (l.includes('const [timeValue, setTimeValue, maxAttempts, setMaxAttempts] = useState(30);')) {
        return '  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)';
    }
    return l;
});

content = cleanedLines.join('\n');

// 2. Fix AI Quiz Section Call
const aiCallMarker = '<AiQuizSection';
const aiStartIndex = content.indexOf(aiCallMarker);
const aiEndIndex = content.indexOf('/>', aiStartIndex);

if (aiStartIndex !== -1 && aiEndIndex !== -1) {
    const aiProps = `
              aiMode={aiMode}
              setAiMode={setAiMode}
              topic={topic}
              setTopic={setTopic}
              file={file}
              setFile={setFile}
              onPickFile={onPickFile}
              fileRef={fileRef}
              instruction={instruction}
              setInstruction={setInstruction}
              numQuestions={numQuestions}
              setNumQuestions={setNumQuestions}
              numOptions={numOptions}
              setNumOptions={setNumOptions}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
              aiLoading={aiLoading}
              aiError={aiError}
              generateWithAI={generateWithAI}
              clampedNumQ={clampedNumQ}
              clampedNumOpt={clampedNumOpt}
    `;
    content = content.slice(0, aiStartIndex + aiCallMarker.length) + aiProps + content.slice(aiEndIndex);
}

// 3. Fix Custom Quiz Section Call
const customCallMarker = '<CustomQuizSection';
const customStartIndex = content.indexOf(customCallMarker);
const customEndIndex = content.indexOf('/>', customStartIndex);

if (customStartIndex !== -1 && customEndIndex !== -1) {
    const customProps = `
              form={form}
              setForm={setForm}
              questions={questions}
              addQuestion={addQuestion}
              removeQuestion={removeQuestion}
              updateQuestion={updateQuestion}
              updateOption={updateOption}
              createQuiz={createQuiz}
              busyCreate={busyCreate}
              profile={profile}
              difficulty={difficulty}
              setDifficulty={setDifficulty}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              maxAttempts={maxAttempts}
              setMaxAttempts={setMaxAttempts}
    `;
    content = content.slice(0, customStartIndex + customCallMarker.length) + customProps + content.slice(customEndIndex);
}

// 4. Fix AiQuizSection Props Definition
const aiDefMarker = 'function AiQuizSection({';
const aiDefStartIndex = content.indexOf(aiDefMarker);
const aiDefEndIndex = content.indexOf('})', aiDefStartIndex);

if (aiDefStartIndex !== -1 && aiDefEndIndex !== -1) {
    const aiParams = `
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts, aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt
`;
    content = content.slice(0, aiDefStartIndex + aiDefMarker.length) + aiParams + content.slice(aiDefEndIndex);
}

// 5. Cleanup extra "Limit Attempts" UI in AI section
// The previous code might have duplicated the NumberField.
// We want exactly ONE NumberField for Limit Attempts in AiQuizSection.
// We'll search for the settings row in AiQuizSection.
const aiSettingsRowMarker = '{/* Settings Row */}';
let aiSectionSplit = content.split(aiSettingsRowMarker);
if (aiSectionSplit.length > 1) {
    let settingsPart = aiSectionSplit[1];
    const settingsEndIndex = settingsPart.indexOf('</div>');
    if (settingsEndIndex !== -1) {
        let insideSettings = settingsPart.slice(0, settingsEndIndex);
        // Replace all "Limit Attempts" NumberFields with just one
        const numberFieldRegex = /<NumberField\s+label="Limit Attempts \(0=∞\)"[\s\S]*?\/>/g;
        const matches = insideSettings.match(numberFieldRegex);
        if (matches && matches.length > 1) {
            insideSettings = insideSettings.replace(numberFieldRegex, '');
            insideSettings += '\n              ' + matches[0];
            content = aiSectionSplit[0] + aiSettingsRowMarker + insideSettings + settingsPart.slice(settingsEndIndex) + (aiSectionSplit[2] || '');
        }
    }
}

fs.writeFileSync(file, content);
console.log('Teacher Dashboard fully repaired (CJS).');
