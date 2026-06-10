'use client'

import { useEffect, useRef, useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { AuditResult } from '@/lib/types'

const MESSAGES = [
  'Reading your website…',
  'Scanning your social presence…',
  'Identifying story gaps…',
  'Scoring your content channels…',
  'Putting together your results…',
]

export function StepAuditLoading() {
  const { state, dispatch } = useWizard()
  const [msgIndex, setMsgIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  // Cycle loading messages (safe to re-run on remount)
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  // Fire audit exactly once (ref guard prevents double-fire under React 19 StrictMode)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    async function runAudit() {
      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelDetails: state.channelDetails,
            preflightResults: state.preflightResults,
            businessInfo: {
              gymName: state.businessInfo!.gymName,
              icp: state.businessInfo!.icp,
              channels: state.businessInfo!.channels,
            },
          }),
        })

        if (!res.ok) {
          throw new Error(`Audit API returned ${res.status}`)
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
          if (parsed?.channels) {
            dispatch({ type: 'SET_AUDIT_RESULTS', data: parsed.channels as AuditResult[] })
            dispatch({ type: 'SET_STEP', step: 5 })
            return
          }
          // Parsed OK but missing channels key
          throw new Error('Audit response missing "channels" field')
        } catch (parseErr) {
          throw new Error(
            parseErr instanceof Error ? parseErr.message : 'Failed to parse audit response'
          )
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong running the audit.')
      }
    }

    runAudit()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
        <p className="text-sm font-medium text-[#1E212E] mb-2">Something went wrong</p>
        <p className="text-xs text-[#444444]/70 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => {
            setError(null)
            startedRef.current = false
            // Re-trigger the effect by forcing a re-render via the error state clear above.
            // Because startedRef is reset, the effect guard will allow it to fire again.
            // We use a tiny workaround: dispatch a no-op step to the same step to remount.
            dispatch({ type: 'SET_STEP', step: 4 })
          }}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-[#81A1D3] border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-sm font-medium text-[#1E212E] mb-1">{MESSAGES[msgIndex]}</p>
      <p className="text-xs text-[#444444]/60">This usually takes 15–30 seconds</p>
    </div>
  )
}
