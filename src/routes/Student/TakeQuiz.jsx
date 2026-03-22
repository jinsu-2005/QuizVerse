import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db, auth } from '../../firebase'
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore'

export default function TakeQuiz(){
  const { quizId } = useParams()
  const nav = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState(null)
  const [reveal, setReveal] = useState(false)
  const [answers, setAnswers] = useState([])

  useEffect(()=>{
    (async ()=>{
      const snap = await getDoc(doc(db, 'quizzes', quizId))
      if (snap.exists()) setQuiz({ id: snap.id, ...snap.data() })
    })()
  },[quizId])

  if(!quiz) return <div>Loading…</div>
  const q = quiz.questions[idx]

  const choose = (opt) => {
    if (selected) return
    setSelected(opt)
    const correct = opt === q.answer
    setReveal(!correct)
    setAnswers(prev => [...prev, { qIndex: idx, chosen: opt, correct }])
  }

  const next = () => {
    setSelected(null); setReveal(false)
    if (idx+1 < quiz.questions.length) setIdx(i=>i+1)
    else finish()
  }

  const finish = async () => {
    const score = answers.filter(a=>a.correct).length + (selected && selected===q.answer ? 1 : 0)
    const total = quiz.questions.length
    const u = auth.currentUser
    if (u) {
      await addDoc(collection(db, 'results', u.uid, 'attempts'), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        score, total,
        attemptedAt: serverTimestamp(),
        answers
      })
    }
    nav(`/result/${quiz.id}?score=${score}&total=${total}`)
  }

  return (
    <div>
      <h2>{quiz.title}</h2>
      <p>{idx+1} / {quiz.questions.length}</p>
      <h3>{q.question}</h3>
      <div>
        {q.options.map(op => (
          <button key={op} onClick={()=>choose(op)} style={{display:'block', margin:'6px 0'}}>
            {op}
          </button>
        ))}
      </div>
      {reveal && <div style={{marginTop:8, color:'crimson'}}>Explanation: {q.explanation || '—'}</div>}
      <div style={{marginTop:10}}>
        <button onClick={next}>{idx+1<quiz.questions.length?'Next':'Finish'}</button>
      </div>
    </div>
  )
}
