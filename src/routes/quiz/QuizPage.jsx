import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function QuizPage() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const { fbUser, profile } = useAuth();

  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { 0: "Option A", 1: "Option C" }
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch quiz
  useEffect(() => {
    async function loadQuiz() {
      try {
        const docRef = doc(db, "quizzes", quizId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError("Quiz not found.");
          return;
        }
        const data = docSnap.data();
        setQuiz({ id: docSnap.id, ...data });

        // Initialize Timer
        if (data.timer?.mode === "total") {
          setTimeLeft(data.timer.time * 60); // minutes to seconds
        } else if (data.timer?.mode === "perQuestion") {
          setTimeLeft(data.timer.time); // seconds
        }
      } catch (err) {
        console.error("Failed to load quiz", err);
        setError("Error loading quiz.");
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  // Handle Timer ticking
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitting) return;
    const t = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(t);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, submitting]);

  const handleTimeUp = () => {
    if (quiz?.timer?.mode === "perQuestion") {
      if (currentIdx < quiz.questions.length - 1) {
        // Auto advance
        handleNext();
      } else {
        // Auto submit
        handleSubmit();
      }
    } else {
      // Total timer up: Auto submit
      handleSubmit();
    }
  };

  const handleSelect = (option) => {
    setAnswers({ ...answers, [currentIdx]: option });
  };

  const handleNext = () => {
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      if (quiz.timer?.mode === "perQuestion") {
        setTimeLeft(quiz.timer.time);
      }
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0 && quiz.timer?.mode !== "perQuestion") {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    let score = 0;

    const questionsData = quiz.questions.map((q, i) => {
      if (answers[i] === q.answer) score += 1;
      return {
        question: q.question,
        options: q.options || [],
        correctAnswer: q.answer,
        selectedAnswer: answers[i] || null,
        explanation: q.explanation || "No explanation provided.",
      };
    });

    try {
      const attemptRef = await addDoc(collection(db, "quizAttempts"), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        studentId: fbUser.uid,
        studentName: profile?.name || fbUser.displayName || "Unknown",
        score,
        total: quiz.questions.length,
        questionsData, // New detailed snapshot
        completedAt: serverTimestamp(),
      });
      nav(`/result/${attemptRef.id}`);
    } catch (err) {
      console.error("Submission error", err);
      alert("Failed to submit quiz. Please check your connection.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">Loading Quiz...</div>;
  }
  if (error || !quiz) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)] transition-colors">
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <button onClick={() => nav("/student")} className="bg-indigo-600 px-6 py-2 rounded-lg font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  const q = quiz.questions[currentIdx];
  const isPerQ = quiz.timer?.mode === "perQuestion";

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] p-4 flex flex-col md:p-8 transition-colors">
      {/* Header */}
      <div className="max-w-3xl mx-auto w-full mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] transition-colors">{quiz.title}</h1>
        <div className="flex items-center justify-between mt-4 bg-[var(--bg-card)] p-4 rounded-xl border border-[var(--border-main)] transition-colors">
          <div className="text-[var(--text-dim)]">
            Question <span className="text-indigo-500 font-bold">{currentIdx + 1}</span> of {quiz.questions.length}
          </div>
          {timeLeft !== null && (
            <div className={`font-mono text-xl ${timeLeft <= 10 ? 'text-rose-500 animate-pulse' : 'text-emerald-500'}`}>
              <svg className="w-5 h-5 inline mr-2 -mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(timeLeft)}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[var(--bg-subtle)] h-1.5 mt-4 rounded-full overflow-hidden transition-colors">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Question Area */}
      <div className="max-w-3xl mx-auto w-full flex-grow flex flex-col">
        <div className="bg-[var(--bg-card)] backdrop-blur-md rounded-2xl border border-[var(--border-main)] p-6 md:p-8 shadow-xl transition-colors">
          <h2 className="text-xl md:text-2xl font-medium leading-relaxed mb-8 text-[var(--text-main)] transition-colors">{q.question}</h2>

          <div className="grid gap-3">
            {q.options.map((opt, i) => {
              const selected = answers[currentIdx] === opt;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${selected
                    ? "border-indigo-600 bg-indigo-600/10 text-indigo-700 dark:text-indigo-300 shadow-md"
                    : "border-[var(--border-main)] bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:bg-[var(--bg-muted)] hover:border-[var(--border-strong)]"
                    }`}
                >
                  <div className="flex items-center">
                    <div className={`w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center mr-4 transition-all ${selected ? 'border-indigo-600 bg-indigo-600' : 'border-[var(--border-main)]'}`}>
                      {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm md:text-base">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={handlePrev}
            disabled={currentIdx === 0 || isPerQ}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${currentIdx === 0 || isPerQ
              ? "bg-[var(--bg-muted)] text-[var(--text-muted)] cursor-not-allowed opacity-50 border border-[var(--border-main)]"
              : "bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-main)] border border-[var(--border-main)]"
              }`}
          >
            Previous
          </button>

          {currentIdx === quiz.questions.length - 1 ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || (!isPerQ && Object.keys(answers).length === 0)}
              className="px-8 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!answers[currentIdx] && !isPerQ} // Only require answer if not timed per-Q
              className="px-8 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
            >
              Next Question
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
