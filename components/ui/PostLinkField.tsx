// components/ui/PostLinkField.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { FetchPostResponse } from '@/lib/og-fetch'
import { FetchedPost } from '@/lib/types'

type Status = 'idle' | 'checking' | 'ok' | 'blocked' | 'invalid'

interface PostLinkFieldProps {
  platformLabel: string
  placeholder?: string
  initialPost?: FetchedPost
  previewMode?: boolean
  onResolved: (post: FetchedPost | null) => void
  onSwitchToManual: () => void
}

export function PostLinkField({
  platformLabel,
  placeholder,
  initialPost,
  previewMode = false,
  onResolved,
  onSwitchToManual,
}: PostLinkFieldProps) {
  const [url, setUrl] = useState(initialPost?.url ?? '')
  const [status, setStatus] = useState<Status>(initialPost ? 'ok' : 'idle')
  const [result, setResult] = useState<FetchedPost | null>(initialPost ?? null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didMountCheck = useRef(false)
  const reqId = useRef(0)

  async function runCheck(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setStatus('idle')
      setResult(null)
      onResolved(null)
      return
    }
    const myReq = ++reqId.current
    setStatus('checking')

    // Preview harness: never hit the network; derive a settled status.
    if (previewMode) {
      if (trimmed.includes('#preview=blocked')) {
        setResult(null); setStatus('blocked'); onResolved(null); return
      }
      if (trimmed.includes('#preview=invalid')) {
        setResult(null); setStatus('invalid'); onResolved(null); return
      }
      const post: FetchedPost = initialPost
        ? { ...initialPost, url: trimmed }
        : { url: trimmed, caption: 'Sample caption from a real post', author: 'yourgym' }
      setResult(post); setStatus('ok'); onResolved(post); return
    }

    try {
      const res = await fetch('/api/fetch-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data: FetchPostResponse = await res.json()
      if (myReq !== reqId.current) return
      if (data.status === 'ok') {
        const post: FetchedPost = {
          url: trimmed,
          caption: data.caption,
          imageUrl: data.imageUrl,
          author: data.author,
        }
        setResult(post); setStatus('ok'); onResolved(post)
      } else {
        setResult(null); setStatus(data.status); onResolved(null)
      }
    } catch {
      if (myReq !== reqId.current) return
      setResult(null); setStatus('blocked'); onResolved(null)
    }
  }

  function scheduleCheck(value: string) {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => {
      debounce.current = null
      runCheck(value)
    }, 400)
  }

  // In preview mode, resolve a seeded URL once on mount (no fetch) so the
  // harness can show blocked / invalid / ok states from the seed.
  useEffect(() => {
    if (didMountCheck.current) return
    didMountCheck.current = true
    if (previewMode && (initialPost?.url ?? '').trim()) {
      runCheck(initialPost!.url)
    }
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <input
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          scheduleCheck(e.target.value)
        }}
        onBlur={() => {
          // Only run on blur if a debounced check is still pending (user blurred
          // before the 400ms fired). If the check already settled, re-running it
          // here would flip status back to 'checking' and unmount the settled
          // state — e.g. destroying the "describe manually" button mid-click.
          if (!debounce.current) return
          clearTimeout(debounce.current)
          debounce.current = null
          runCheck(url)
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]"
        placeholder={placeholder ?? `Paste a link to one ${platformLabel} post`}
      />

      {status === 'checking' && (
        <p className="mt-1.5 text-xs text-[#444444]/70 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-[#81A1D3] border-t-transparent rounded-full animate-spin" />
          Checking this post…
        </p>
      )}

      {status === 'ok' && result && (
        <div className="mt-1.5 bg-[#f0f5fb] border border-[#81A1D3] rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E]">
            ✓ Got it{result.author ? ` — post from @${result.author}` : ''}
          </p>
          {result.caption && (
            <p className="text-xs text-[#444444] mt-1 whitespace-pre-wrap">{result.caption}</p>
          )}
        </div>
      )}

      {status === 'blocked' && (
        <p className="mt-1.5 text-xs text-amber-700">
          ⚠ Couldn't access this post — {platformLabel} sometimes blocks automated access. Try
          another post, or{' '}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="underline font-bold hover:text-amber-900"
          >
            describe your posts manually instead →
          </button>
        </p>
      )}

      {status === 'invalid' && (
        <p className="mt-1.5 text-xs text-amber-700">
          ⚠ That doesn't look like a post link — paste a link to a single post.
        </p>
      )}
    </div>
  )
}
