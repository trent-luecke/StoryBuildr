// components/steps/StepStoryMine.tsx
'use client'

import { useState } from 'react'
import { useWizard } from '@/hooks/useWizard'

const QUESTIONS = [
  'Describe a member win from the last 30 days — what changed for them?',
  'What does a typical morning look like at your gym? Walk us through it.',
  'Tell us about a mistake you made as an owner and what you learned.',
  'Why did you start this gym — what\'s the real reason, not the elevator pitch?',
  'Who is your "typical" member, and what were they afraid of before they joined?',
  'What does your gym do that most gyms don\'t?',
  'Describe your coaching philosophy in one or two sentences.',
  'What\'s a moment in the last 6 months that made you proud?',
  'If a new member could only read one thing about your gym before joining, what would you want it to say?',
  'What does your gym look like on its best day?',
]

export function StepStoryMine() {
  const { state, dispatch } = useWizard()
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState(state.storyMineAnswers[currentQ] ?? '')

  function saveAndAdvance() {
    if (answer.trim()) {
      dispatch({ type: 'SET_STORY_MINE_ANSWER', questionIndex: currentQ, answer: answer.trim() })
    }
    if (currentQ < QUESTIONS.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next)
      setAnswer(state.storyMineAnswers[next] ?? '')
    } else {
      dispatch({ type: 'SET_STEP', step: 7 })
    }
  }

  function skip() {
    if (currentQ < QUESTIONS.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next)
      setAnswer(state.storyMineAnswers[next] ?? '')
    } else {
      dispatch({ type: 'SET_STEP', step: 7 })
    }
  }

  const progress = ((currentQ) / QUESTIONS.length) * 100

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Story Mine</p>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 bg-gray-100 rounded-full">
          <div className="h-1 bg-[#81A1D3] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-[#444444]/60 shrink-0">{currentQ + 1} / {QUESTIONS.length}</span>
      </div>

      <h2 className="text-xl font-extrabold text-[#1E212E] leading-snug mb-2">
        {QUESTIONS[currentQ]}
      </h2>
      <p className="text-xs text-[#444444]/60 mb-4">Take your time — there's no wrong answer. Skip if you'd rather move on.</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3] mb-4"
        placeholder="Write as much or as little as you'd like…"
      />

      <div className="flex justify-between items-center">
        <button type="button" onClick={skip} className="text-sm text-[#444444]/50 hover:text-[#444444]">
          Skip →
        </button>
        <button
          type="button"
          onClick={saveAndAdvance}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          {currentQ < QUESTIONS.length - 1 ? 'Next question →' : 'Build my plan →'}
        </button>
      </div>
    </div>
  )
}
