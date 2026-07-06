import { notFound } from 'next/navigation'
import { PreviewHarness } from '@/components/preview/PreviewHarness'

export const metadata = { title: 'StoryBuildr — Preview' }

export default function PreviewPage() {
  // Available in local dev (VERCEL_ENV undefined) and preview deployments; 404 in production.
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <PreviewHarness />
}
