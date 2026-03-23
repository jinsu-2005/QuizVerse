import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const badBlockStart = '<AiQuizSection';
const badBlockEnd = 'clampedNumQ={clampedNumQ}';

const newBlock = `
            <AiQuizSection
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
`;

// Find everything between AiQuizSection and clampedNumQ and replace
const startIndex = content.indexOf(badBlockStart);
const endIndex = content.indexOf(badBlockEnd);

if (startIndex !== -1 && endIndex !== -1) {
    const finalContent = content.slice(0, startIndex) + newBlock + content.slice(endIndex);
    fs.writeFileSync(file, finalContent);
    console.log('AiQuizSection props cleaned up.');
} else {
    console.error('Markers not found.');
}
