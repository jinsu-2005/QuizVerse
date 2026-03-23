import fs from 'fs';
const file = 'c:/Users/jinsu/Documents/My Projects/Quiz-Verse/src/routes/Teacher/Dashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const badBlockStart = '<CustomQuizSection';
const badBlockEnd = '/>';
const offset = content.indexOf(badBlockStart);

const newBlock = `
            <CustomQuizSection
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
            />
`;

// Find everything between CustomQuizSection and the NEXT />
const endTagIndex = content.indexOf(badBlockEnd, offset);

if (offset !== -1 && endTagIndex !== -1) {
    const finalContent = content.slice(0, offset) + newBlock + content.slice(endTagIndex + 2);
    fs.writeFileSync(file, finalContent);
    console.log('CustomQuizSection props restored and updated.');
} else {
    console.error('Markers not found.');
}
