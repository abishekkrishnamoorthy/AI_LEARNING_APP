import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import HomeLayout from '../components/layout/HomeLayout'
import { getAuthToken } from '../utils/authStorage'

function NotesPage() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
  const token = getAuthToken()
  const [selectedTopic, setSelectedTopic] = useState('all')
  const [selectedNote, setSelectedNote] = useState(null)

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', selectedTopic],
    queryFn: async () => {
      const url =
        selectedTopic === 'all'
          ? `${apiBaseUrl}/api/notes`
          : `${apiBaseUrl}/api/notes?topicId=${selectedTopic}`
      const response = await fetch(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!response.ok) throw new Error('Failed to fetch notes')
      return response.json()
    },
  })

  const topics = useMemo(
    () =>
      [
        ...new Map(
          notes.map((note) => [note.topicId, { id: String(note.topicId), name: note.topicName }])
        ).values(),
      ],
    [notes]
  )

  useEffect(() => {
    if (!notes.length) {
      setSelectedNote(null)
      return
    }

    const exists = notes.find((note) => String(note._id) === String(selectedNote?._id))
    if (!exists) {
      setSelectedNote(notes[0])
    } else {
      setSelectedNote(exists)
    }
  }, [notes, selectedNote?._id])

  const downloadTxt = (note) => {
    if (!note) return

    const text = [
      `Topic: ${note.topicName}`,
      `Day ${note.dayNumber} · Cycle ${note.cycleNumber}`,
      `Subtopic: ${note.subtopic}`,
      `Saved: ${new Date(note.savedAt).toDateString()}`,
      '',
      '--- MY NOTES ---',
      note.content || '',
      '',
      '--- AI SUMMARY ---',
      note.aiSummary || '',
      '',
      '--- KEY TAKEAWAYS ---',
      (note.takeaways || []).map((item, index) => `${index + 1}. ${item}`).join('\n'),
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${note.topicName}-day${note.dayNumber}-notes.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const downloadTopicPdf = async (topicId, topicName) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/notes/download/pdf/${topicId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      if (!response.ok) throw new Error('PDF download failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${topicName}-notes.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      document.body.removeChild(anchor)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download error:', error)
      alert('Could not download PDF. Please try again.')
    }
  }

  return (
    <HomeLayout title="Notes" subtitle="Review and download your saved notes." showCreateTopicButton={false}>
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '12px',
          minHeight: 'calc(100vh - 120px)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <aside
          style={{
            border: '1px solid #E0E0E0',
            borderRadius: '12px',
            background: '#fff',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ padding: '12px', borderBottom: '1px solid #E0E0E0' }}>
            <label htmlFor="topic-filter" style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px' }}>
              Filter by topic
            </label>
            <select
              id="topic-filter"
              value={selectedTopic}
              onChange={(event) => setSelectedTopic(event.target.value)}
              style={{
                width: '100%',
                border: '1px solid #E0E0E0',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '12px',
                color: '#1A1A1A',
                background: '#fff',
              }}
            >
              <option value="all">All topics</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowY: 'auto', padding: '8px', display: 'grid', gap: '8px' }}>
            {isLoading ? <p style={{ fontSize: '12px', color: '#666', padding: '8px' }}>Loading notes...</p> : null}

            {!isLoading && notes.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#666', padding: '8px', lineHeight: 1.5 }}>
                No notes saved yet. Notes are saved at the end of each day on the Summary page.
              </p>
            ) : null}

            {notes.map((note) => {
              const isActive = String(note._id) === String(selectedNote?._id)
              return (
                <button
                  key={note._id}
                  type="button"
                  onClick={() => setSelectedNote(note)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${isActive ? '#C8A2C8' : '#E0E0E0'}`,
                    borderRadius: '10px',
                    padding: '10px',
                    background: isActive ? '#E6E6FA' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#7B5EA7', marginBottom: '4px' }}>
                    Day {note.dayNumber} · Cycle {note.cycleNumber}
                  </div>
                  <div style={{ fontSize: '12px', color: '#1A1A1A', fontWeight: 500, marginBottom: '4px' }}>{note.subtopic}</div>
                  <div style={{ fontSize: '11px', color: '#555', marginBottom: '6px' }}>
                    {String(note.content || '').slice(0, 60)}
                    {String(note.content || '').length > 60 ? '...' : ''}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        background: '#F5F5F5',
                        color: '#666',
                      }}
                    >
                      {note.topicName}
                    </span>
                    <span style={{ fontSize: '10px', color: '#888' }}>{new Date(note.savedAt).toLocaleDateString()}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        <article
          style={{
            border: '1px solid #E0E0E0',
            borderRadius: '12px',
            background: '#fff',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {!selectedNote ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#666', fontSize: '13px', lineHeight: 1.5 }}>
              No notes saved yet. Notes are saved at the end of each day on the Summary page.
            </div>
          ) : (
            <>
              <header style={{ padding: '16px', borderBottom: '1px solid #E0E0E0' }}>
                <h2
                  style={{
                    margin: 0,
                    color: '#1A1A1A',
                    fontFamily: 'Fraunces, serif',
                    fontStyle: 'italic',
                    fontSize: '25px',
                  }}
                >
                  {selectedNote.subtopic}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#666' }}>
                  {selectedNote.topicName} · Day {selectedNote.dayNumber} · Cycle {selectedNote.cycleNumber}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => downloadTxt(selectedNote)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E0E0E0',
                      background: '#F5F5F5',
                      color: '#1A1A1A',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Download .txt
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadTopicPdf(selectedNote.topicId, selectedNote.topicName)}
                    style={{
                      padding: '7px 12px',
                      borderRadius: '8px',
                      border: '1px solid #E0E0E0',
                      background: '#E6E6FA',
                      color: '#7B5EA7',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Download PDF
                  </button>
                </div>
              </header>

              <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
                <section style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#7B5EA7' }}>My notes</h3>
                  <div style={{ border: '1px solid #E0E0E0', borderRadius: '10px', padding: '12px', background: '#fff', whiteSpace: 'pre-wrap', fontSize: '12px', color: '#1A1A1A', lineHeight: 1.7 }}>
                    {selectedNote.content || 'No notes text saved.'}
                  </div>
                </section>

                <section style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#7B5EA7' }}>AI summary</h3>
                  <div style={{ border: '1px solid #E0E0E0', borderRadius: '10px', padding: '12px', background: '#F5F5F5', fontSize: '12px', color: '#1A1A1A', lineHeight: 1.7 }}>
                    {selectedNote.aiSummary || 'No AI summary saved.'}
                  </div>
                </section>

                <section>
                  <h3 style={{ margin: '0 0 8px', fontSize: '13px', color: '#7B5EA7' }}>Key takeaways</h3>
                  <div style={{ border: '1px solid #E0E0E0', borderRadius: '10px', padding: '12px', background: '#fff' }}>
                    {selectedNote.takeaways?.length ? (
                      <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#1A1A1A', lineHeight: 1.7 }}>
                        {selectedNote.takeaways.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>No takeaways saved.</p>
                    )}
                  </div>
                </section>
              </div>

              <footer
                style={{
                  padding: '12px 16px',
                  borderTop: '1px solid #E0E0E0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#1D9E75' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1D9E75' }} />
                  Saved {new Date(selectedNote.savedAt).toDateString()}
                </div>
                <button
                  type="button"
                  onClick={() => downloadTopicPdf(selectedNote.topicId, selectedNote.topicName)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#7B5EA7',
                    color: '#fff',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Download full topic PDF
                </button>
              </footer>
            </>
          )}
        </article>
      </section>
    </HomeLayout>
  )
}

export default NotesPage
