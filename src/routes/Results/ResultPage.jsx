import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";

export default function ResultPage() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const { fbUser } = useAuth();
  
  const [attempt, setAttempt] = useState(null);
  const [bestScore, setBestScore] = useState(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [showReview, setShowReview] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedExplanations, setExpandedExplanations] = useState({});

  const toggleExplanation = (idx) => {
    setExpandedExplanations(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  useEffect(() => {
    async function loadData() {
      if (!fbUser) return;
      try {
        // Fetch current attempt
        const docRef = doc(db, "quizAttempts", attemptId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setError("Result not found.");
          setLoading(false);
          return;
        }
        
        const currentData = { id: docSnap.id, ...docSnap.data() };
        setAttempt(currentData);

        // Fetch all attempts for this quiz by this user to find best score
        const qRef = query(
          collection(db, "quizAttempts"),
          where("quizId", "==", currentData.quizId),
          where("studentId", "==", fbUser.uid)
        );
        const allAttemptsSnap = await getDocs(qRef);
        
        let highest = 0;
        let isLatestBest = false;
        
        // Loop to find the highest score
        allAttemptsSnap.forEach(d => {
          const score = d.data().score;
          if (score > highest) highest = score;
        });
        
        // Check if CURRENT attempt equals the highest score found
        if (currentData.score >= highest && currentData.score > 0) {
          isLatestBest = true;
          highest = currentData.score;
        }
        
        setBestScore(highest);
        setIsNewBest(isLatestBest && allAttemptsSnap.size > 1); // Only say "New Best" if there are multiple attempts
        
      } catch (err) {
        console.error("Failed to load result", err);
        setError("Error loading result data.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [attemptId, fbUser]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-[var(--bg-main)] text-[var(--text-main)]">Loading Results...</div>;
  }
  if (error || !attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-main)] text-[var(--text-main)]">
        <h2 className="text-2xl font-bold mb-4">{error}</h2>
        <button onClick={() => nav("/student")} className="bg-indigo-600 px-6 py-2 rounded-lg font-bold text-white shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Go Back</button>
      </div>
    );
  }

  const scorePct = Math.round((attempt.score / attempt.total) * 100);
  const bestPct = bestScore !== null ? Math.round((bestScore / attempt.total) * 100) : scorePct;
  
  let ringColor = "text-red-500";
  let greeting = "Keep Practicing!";
  let message = "Review the materials and try again. You've got this!";
  
  if (scorePct >= 80) {
    ringColor = "text-green-500";
    greeting = "Outstanding!";
    message = "Excellent work. You have mastered this quiz.";
  } else if (scorePct >= 50) {
    ringColor = "text-yellow-400";
    greeting = "Good Job!";
    message = "You're getting there! A little more review and you'll be an expert.";
  }

  // Backward compatibility: If it's an old attempt without questionsData, don't show review mode
  const canReview = !!attempt.questionsData;

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col items-center transition-colors">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-4xl p-4 md:p-8 relative z-10 flex flex-col items-center">
        
        {/* Main Result Card */}
        <div className="w-full max-w-lg bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-main)] rounded-3xl p-8 md:p-12 shadow-2xl text-center animate-[fadeInUp_500ms_ease_forwards] mt-8 transition-colors">
          
          {isNewBest && (
            <div className="mb-4 inline-flex items-center gap-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-bounce">
              <span>🏆 New Personal Best!</span>
            </div>
          )}

          <h1 className="text-3xl font-extrabold mb-2 text-[var(--text-main)]">{greeting}</h1>
          <p className="text-[var(--text-dim)] text-sm mb-8">{message}</p>
          
          {/* Score Circle */}
          <div className="relative w-48 h-48 mx-auto -mb-6 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="96" cy="96" r="88" className="text-[var(--bg-subtle)]" strokeWidth="12" stroke="currentColor" fill="none" />
              <circle 
                cx="96" cy="96" r="88" 
                className={`${ringColor} transition-all duration-1000 ease-out`} 
                strokeWidth="12" 
                strokeDasharray={552.92} /* 2 * PI * 88 */
                strokeDashoffset={552.92 - (552.92 * scorePct) / 100}
                strokeLinecap="round" 
                stroke="currentColor" 
                fill="none" 
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-black text-[var(--text-main)]">{scorePct}%</span>
              <span className="text-[var(--text-dim)] text-sm uppercase tracking-wider font-semibold mt-1">Score</span>
            </div>
          </div>

          {/* Stats breakdown */}
          <div className="mt-12 bg-[var(--bg-subtle)] rounded-2xl p-6 border border-[var(--border-main)] flex justify-between transition-colors">
            <div className="text-center w-1/3">
              <div className="text-[10px] text-[var(--text-dim)] tracking-wider uppercase">Correct</div>
              <div className="text-2xl font-bold text-emerald-500 mt-1">{attempt.score}</div>
            </div>
            <div className="w-px bg-[var(--border-main)]" />
            <div className="text-center w-1/3">
              <div className="text-[10px] text-[var(--text-dim)] tracking-wider uppercase">Incorrect</div>
              <div className="text-2xl font-bold text-rose-500 mt-1">{attempt.total - attempt.score}</div>
            </div>
            <div className="w-px bg-[var(--border-main)]" />
            <div className="text-center w-1/3">
              <div className="text-[10px] text-amber-500/80 tracking-wider uppercase">Best Score</div>
              <div className="text-2xl font-bold text-amber-500 mt-1">{bestPct}%</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {canReview && (
              <button
                onClick={() => setShowReview(!showReview)}
                className="flex-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-main)] hover:bg-[var(--bg-muted)] text-[var(--text-main)] font-bold py-3 transition-all"
              >
                {showReview ? "Hide Answers" : "Review Answers"}
              </button>
            )}
            <button
              onClick={() => nav(`/quiz/${attempt.quizId}`)}
              className="flex-1 rounded-xl bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 text-white font-bold py-3 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              Retake Quiz
            </button>
          </div>
          
          <button onClick={() => nav("/student")} className="mt-4 text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm transition-colors w-full p-2">
            Return to Dashboard
          </button>
        </div>

        {/* Answer Review Section */}
        {showReview && canReview && (
          <div className="w-full mt-12 animate-[fadeInUp_500ms_ease_forwards] transition-colors">
            <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6 flex items-center gap-3">
              Reviewing: {attempt.quizTitle || attempt.quizId}
            </h2>
            
            <div className="flex flex-col gap-6">
              {attempt.questionsData.map((q, idx) => {
                const isExpanded = !!expandedExplanations[idx];

                return (
                  <div key={idx} className="rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] p-6 shadow-md transition-colors">
                    <h3 className="text-lg font-bold text-[var(--text-main)] mb-6 transition-colors">
                      {idx + 1}. {q.question}
                    </h3>
                    
                    <div className="grid gap-3">
                      {q.options.map((opt, oIdx) => {
                        const isSelect = q.selectedAnswer === opt;
                        const isActualAnswer = q.correctAnswer === opt;
                        
                        let optClass = "border-transparent bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:bg-[var(--bg-muted)]";
                        let pill = null;
                        
                        if (isSelect && isActualAnswer) {
                           optClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                           pill = <span className="text-[11px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">Your Answer ✓ Correct</span>;
                        } else if (isSelect && !isActualAnswer) {
                           optClass = "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400";
                           pill = <span className="text-[11px] font-bold text-white bg-rose-500 px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors">Your Answer ✗ Incorrect</span>;
                        } else if (isActualAnswer) {
                           optClass = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 opacity-90";
                           pill = <span className="text-[11px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full transition-colors">✓ Correct Answer</span>;
                        }
                        
                        return (
                          <div key={oIdx} className={`p-4 rounded-lg border flex items-center justify-between transition-all duration-200 ${optClass}`}>
                            <span className="font-semibold">{opt}</span>
                            {pill}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Explanation Toggle */}
                    {q.explanation && (
                      <div className="mt-6 border-t border-[var(--border-main)] pt-4 transition-colors">
                            <button 
                              onClick={() => toggleExplanation(idx)}
                              className="text-sm flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                              View Explanation
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 text-sm leading-relaxed animate-[fadeIn_300ms_ease_forwards] transition-colors">
                                <span className="font-bold block mb-1">Explanation:</span>
                                {q.explanation}
                              </div>
                            )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
