/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react'
import { useDraftNotes } from '../../hooks/useDraftNotes'

function NotesPanel({ cycleId, dayNumber, mode = 'panel' }) {
  const { content, updateContent } = useDraftNotes(cycleId, dayNumber)
  const [saveIndicator, setSaveIndicator] = useState('')

  useEffect(() => {
    let timer
    if (saveIndicator === 'Saving...') {
      timer = setTimeout(() => {
        setSaveIndicator('Draft saved')
      }, 1100)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [saveIndicator])

  function handleChange(event) {
    updateContent(event.target.value)
    setSaveIndicator('Saving...')
  }

  const panelStyle =
    mode === 'panel'
      ? {
          width: '30%',
          minWidth: '220px',
          height: '100%',
          borderRight: '1px solid #E0E0E0',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
        }
      : {
          width: '320px',
          height: '100%',
          borderLeft: '1px solid #E0E0E0',
          display: 'flex',
          flexDirection: 'column',
          background: '#fff',
          position: 'absolute',
          right: 0,
          top: 0,
          zIndex: 20,
        }

  return (
    <div style={panelStyle}>
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' }}>
          My notes
        </span>
        <span style={{ fontSize: '10px', color: '#aaa', fontFamily: 'DM Sans, sans-serif' }}>
          {saveIndicator || 'Auto-saved locally'}
        </span>
      </div>

      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Write your notes here...&#10;&#10;They will be saved permanently on the Summary page."
        style={{
          flex: 1,
          padding: '14px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: '12px',
          lineHeight: 1.65,
          color: '#1A1A1A',
          fontFamily: 'DM Sans, sans-serif',
          background: '#fff',
        }}
      />

      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid #E0E0E0',
          fontSize: '10px',
          color: '#bbb',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        Draft only - saved permanently at Summary
      </div>
    </div>
  )
}

export default NotesPanel
