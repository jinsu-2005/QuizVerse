import React from 'react'
import { useLocation, Link } from 'react-router-dom'

export default function ResultPage(){
  const params = new URLSearchParams(useLocation().search)
  const score = Number(params.get('score') || 0)
  const total = Number(params.get('total') || 0)
  return (
    <div>
      <h2>Result</h2>
      <p>Your score: {score} / {total}</p>
      <Link to="/student">Back to dashboard</Link>
    </div>
  )
}
