import fs from 'fs';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Clean up duplicate state declarations
const searchStr = 'const [maxAttempts, setMaxAttempts] = useState(0);';
const parts = content.split(searchStr);
if (parts.length > 2) {
    // Keep just one
    content = parts[0] + searchStr + parts.slice(1).join('');
}

// 2. Fix the broken timeValue line
content = content.replace(/const \[timeValue, setTimeValue, maxAttempts, setMaxAttempts\] = useState\(30\);/g, 'const [timeValue, setTimeValue] = useState(30);');

// 3. Re-inject clean AiQuizSection props
const aiTag = '<AiQuizSection';
const aiStartIdx = content.indexOf(aiTag);
const aiEndIdx = content.indexOf('/>', aiStartIdx);

if (aiStartIdx !== -1 && aiEndIdx !== -1) {
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
    content = content.slice(0, aiStartIdx + aiTag.length) + aiProps + content.slice(aiEndIdx);
}

// 4. Re-inject clean CustomQuizSection props
const customTag = '<CustomQuizSection';
const customStartIdx = content.indexOf(customTag);
const customEndIdx = content.indexOf('/>', customStartIdx);

if (customStartIdx !== -1 && customEndIdx !== -1) {
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
    content = content.slice(0, customStartIdx + customTag.length) + customProps + content.slice(customEndIdx);
}

// 5. Fix definition params
const defTag = 'function AiQuizSection({';
const defStartIdx = content.indexOf(defTag);
const defEndIdx = content.indexOf('})', defStartIdx);

if (defStartIdx !== -1 && defEndIdx !== -1) {
    const params = `
  aiMode, setAiMode, topic, setTopic, file, setFile, onPickFile, fileRef,
  instruction, setInstruction, numQuestions, setNumQuestions, numOptions, setNumOptions,
  difficulty, setDifficulty, timerMode, setTimerMode, timeValue, setTimeValue,
  maxAttempts, setMaxAttempts, aiLoading, aiError, generateWithAI, clampedNumQ, clampedNumOpt
`;
    content = content.slice(0, defStartIdx + defTag.length) + params + content.slice(defEndIdx);
}

fs.writeFileSync(file, content);
console.log('Final Teacher Repair Done.');
