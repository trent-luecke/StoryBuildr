// lib/pdf/ReportDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { AuditResult, Story, Channel, StoryPlan } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#444444' },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 4, marginTop: 16 },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 3 },
  label: { fontSize: 8, color: '#81A1D3', fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 },
  body: { fontSize: 10, lineHeight: 1.6, color: '#444444', marginBottom: 6 },
  small: { fontSize: 9, color: '#888888', marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  chip: { fontSize: 8, color: '#81A1D3', backgroundColor: '#f0f5fb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 3 },
  bullet: { fontSize: 9, color: '#444444', marginBottom: 2 },
})

interface Props {
  gymName: string
  auditResults: AuditResult[]
  storyPlan: StoryPlan
  activeChannels: Channel[]
}

export function ReportDocument({ gymName, auditResults, storyPlan, activeChannels }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.label}>STORYBUILDR REPORT</Text>
        <Text style={s.h1}>{gymName}</Text>
        <View style={s.divider} />

        {/* Section 1: Audit Results */}
        <Text style={s.label}>SECTION 1 — AUDIT RESULTS</Text>
        {auditResults.map((r) => (
          <View key={r.channel}>
            <View style={[s.row, { alignItems: 'flex-start', marginBottom: 4 }]}>
              <View style={s.col}>
                <Text style={s.h3}>{CHANNEL_LABELS[r.channel] ?? r.channel}</Text>
              </View>
              <View>
                {r.score !== null
                  ? <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E212E' }}>{r.score}/10</Text>
                  : <Text style={s.chip}>Self-reported</Text>
                }
              </View>
            </View>
            <Text style={s.body}>{r.narrative}</Text>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#81A1D3', marginBottom: 3 }}>Doing well</Text>
                {r.doingWell.map((item, i) => <Text key={i} style={s.bullet}>✓ {item}</Text>)}
              </View>
              <View style={s.col}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#f87171', marginBottom: 3 }}>Opportunities</Text>
                {r.opportunities.map((item, i) => <Text key={i} style={s.bullet}>→ {item}</Text>)}
              </View>
            </View>
            <View style={s.divider} />
          </View>
        ))}

        {/* Section 2: Stories */}
        <Text style={s.label}>SECTION 2 — YOUR STORIES</Text>
        {storyPlan.stories.map((story, i) => (
          <View key={i}>
            <Text style={s.h2}>Story {i + 1}: {story.title}</Text>
            <Text style={s.chip}>{story.type}</Text>
            <Text style={s.body}>{story.whySelected}</Text>
            {activeChannels.map((channel) => {
              const copy = story.channels[channel]
              if (!copy) return null
              return (
                <View key={channel} style={{ marginBottom: 8 }}>
                  <Text style={s.h3}>{CHANNEL_LABELS[channel]}</Text>
                  <Text style={s.body}>{copy.copy}</Text>
                  <Text style={s.small}>Visual: {copy.visualRecommendation}</Text>
                  <Text style={s.small}>Post date: {copy.suggestedPostDate}</Text>
                </View>
              )
            })}
            <View style={s.divider} />
          </View>
        ))}

        {/* Section 3: Timeline */}
        <Text style={s.label}>SECTION 3 — 30-DAY POSTING TIMELINE</Text>
        {storyPlan.stories.map((story, si) =>
          activeChannels.map((channel) => {
            const copy = story.channels[channel]
            if (!copy) return null
            return (
              <Text key={`${si}-${channel}`} style={s.bullet}>
                {copy.suggestedPostDate} · {CHANNEL_LABELS[channel]} · {story.title}
              </Text>
            )
          })
        )}
      </Page>
    </Document>
  )
}
