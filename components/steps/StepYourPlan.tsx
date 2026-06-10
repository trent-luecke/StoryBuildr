'use client'

import { useEffect, useRef, useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { StoryCard } from '@/components/plan/StoryCard'
import { PdfCallout } from '@/components/ui/PdfCallout'
import { Story } from '@/lib/types'

export function StepYourPlan() {
  const { state, dispatch } = useWizard()
  const [loading, setLoading] = useState(!state.storyPlan)
  const [stories, setStories] = useState<Story[]>(state.storyPlan?.stories ?? [])
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const startedAttempt = useRef(-1)

  const activeChannels = state.businessInfo?.channels ?? []

  // Fire generation once per attempt (ref guard prevents double-fire under React 19 StrictMode).
  // Short-circuit: if storyPlan already in state, nothing to do.
  useEffect(() => {
    if (state.storyPlan) return            // already generated; nothing to do
    if (startedAttempt.current === attempt) return
    startedAttempt.current = attempt

    async function generate() {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessInfo: state.businessInfo,
            auditResults: state.auditResults,
            storyMineAnswers: state.storyMineAnswers,
          }),
        })

        if (!res.ok) {
          throw new Error(`Generate API returned ${res.status}`)
        }

        // Accumulate the full streamed body — it is ONE complete JSON document
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let raw = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          raw += decoder.decode(value, { stream: true })
        }
        // Flush any remaining bytes
        raw += decoder.decode()

        // Parse the whole document once — never try to split by newline
        try {
          const parsed = JSON.parse(raw)
          if (parsed?.stories) {
            const plan = { stories: parsed.stories as Story[] }
            dispatch({ type: 'SET_STORY_PLAN', data: plan })
            setStories(parsed.stories)
            setLoading(false)
            return
          }
          throw new Error('Generate response missing "stories" field')
        } catch (parseErr) {
          throw new Error(
            parseErr instanceof Error ? parseErr.message : 'Failed to parse generate response'
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong generating your plan.')
        setLoading(false)
      }
    }

    generate()
  }, [attempt]) // eslint-disable-line react-hooks/exhaustive-deps

  async function downloadPdf() {
    setDownloading(true)
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymName: state.businessInfo?.gymName,
        auditResults: state.auditResults,
        storyPlan: state.storyPlan,
        activeChannels,
      }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'storybuildr-report.pdf'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-[#81A1D3] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-sm font-medium text-[#1E212E]">Building your 30-day content plan…</p>
        <p className="text-xs text-[#444444]/60 mt-1">This takes about 20–30 seconds</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <p className="text-sm font-medium text-[#1E212E] mb-2">Something went wrong</p>
        <p className="text-xs text-[#444444]/70 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); setAttempt((a) => a + 1) }}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Your Content Plan</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">30 days of stories, built from yours</h2>
      <p className="text-sm text-[#444444] mb-5">
        We picked {stories.length} stories from your answers and mapped them across your channels.
      </p>

      <PdfCallout />

      {stories.map((story, i) => (
        <StoryCard
          key={i}
          story={story}
          activeChannels={activeChannels}
          defaultExpanded={i === 0}
          index={i}
        />
      ))}

      <button
        onClick={downloadPdf}
        disabled={downloading}
        className="w-full bg-[#81A1D3] text-[#1E212E] font-extrabold py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors mt-4"
      >
        {downloading ? 'Generating PDF…' : 'Download your full report →'}
      </button>
    </div>
  )
}
