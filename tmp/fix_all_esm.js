import fs from 'fs';
import path from 'path';

const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix state duplicates and errors
const lines = content.split('\n');
let foundMaxAttempts = false;
let cleanedLines = [];
let removedDupes = 0;

lines.forEach(l => {
    if (l.includes('const [maxAttempts, setMaxAttempts] = useState(0);')) {
        if (foundMaxAttempts) {
            removedDupes++;
            return;
        }
        foundMaxAttempts = true;
    }
    // Also fix the timeValue mess
    if (l.includes('const [timeValue, setTimeValue, maxAttempts, setMaxAttempts] = useState(30);')) {
        cleanedLines.push('  const [timeValue, setTimeValue] = useState(30); // seconds (perQ) or minutes (total)');
        return;
    }
    cleanedLines.push(l);
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
const customStartIndex = content.indexOf(customStartMarker || '<CustomQuizSection');
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

fs.writeFileSync(file, content);
console.log('Teacher Dashboard fully repaired (ESM).');
