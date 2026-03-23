import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. Remove duplicate state declarations in TeacherDashboard
// Keep the first one, remove others
let foundState = false;
lines = lines.filter(line => {
    if (line.includes('const [maxAttempts, setMaxAttempts] = useState(0);')) {
        if (foundState) return false;
        foundState = true;
    }
    return true;
});

// 2. Fix the line 86 mess if it still exists
lines = lines.map(line => {
    if (line.includes('const [timeValue, setTimeValue, maxAttempts, setMaxAttempts] = useState(30);')) {
        return '  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)';
    }
    return line;
});

// 3. Fix AiQuizSection props (lines 680-715 ish)
// I'll do a string replace on the whole content for the components specifically to be cleaner.
let content = lines.join('\n');

// Standard AiQuizSection call
const aiStart = '<AiQuizSection';
const aiEnd = '/>';
const aiStartIndex = content.indexOf(aiStart);
const aiEndIndex = content.indexOf(aiEnd, aiStartIndex);

if (aiStartIndex !== -1 && aiEndIndex !== -1) {
    const aiProps = \`
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
    \`;
    content = content.slice(0, aiStartIndex + aiStart.length) + aiProps + content.slice(aiEndIndex);
}

// Standard CustomQuizSection call
const customStart = '<CustomQuizSection';
const customEnd = '/>';
const customStartIndex = content.indexOf(customStart);
const customEndIndex = content.indexOf(customEnd, customStartIndex);

if (customStartIndex !== -1 && customEndIndex !== -1) {
    const customProps = \`
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
    \`;
    content = content.slice(0, customStartIndex + customStart.length) + customProps + content.slice(customEndIndex);
}

// 4. Fix AiQuizSection definition (remove duplicate Limit Attempts and double props)
const defStart = 'function AiQuizSection({';
const defEnd = '})';
const defStartIndex = content.indexOf(defStart);
const defEndIndex = content.indexOf(defEnd, defStartIndex);

if (defStartIndex !== -1 && defEndIndex !== -1) {
    const newParams = \`
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts, aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt
\`;
    content = content.slice(0, defStartIndex + defStart.length) + newParams + content.slice(defEndIndex);
}

fs.writeFileSync(file, content);
console.log('Teacher Dashboard fully repaired.');
