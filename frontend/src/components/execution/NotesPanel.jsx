/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDraftNotes } from '../../hooks/useDraftNotes'

function NotesPanel({ cycleId, dayNumber, mode = 'panel' }) {
  const { content, updateContent } = useDraftNotes(cycleId, dayNumber)
  const [saveIndicator, setSaveIndicator] = useState('')
  const [toolsOpen, setToolsOpen] = useState(false)
  const textareaRef = useRef(null)
  const menuRef = useRef(null)

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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!toolsOpen || menuRef.current?.contains(event.target)) return
      setToolsOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setToolsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [toolsOpen])

  const stats = useMemo(() => {
    const trimmed = content.trim()
    return {
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      chars: content.length,
    }
  }, [content])

  const tools = useMemo(
    () => [
      { label: 'Heading', action: () => applyLinePrefix('## ', 'Heading') },
      { label: 'Bold', action: () => applyMarkdown('**', '**', 'bold text') },
      { label: 'Italic', action: () => applyMarkdown('_', '_', 'italic text') },
      { label: 'Bullet list', action: () => applyLinePrefix('- ', 'List item') },
      { label: 'Numbered list', action: () => applyLinePrefix('1. ', 'List item') },
      { label: 'Quote', action: () => applyLinePrefix('> ', 'Important note') },
      { label: 'Divider', action: () => insertBlock('\n---\n') },
      { label: 'Inline code', action: () => applyMarkdown('`', '`', 'code') },
      { label: 'Code block', action: () => applyMarkdown('```\n', '\n```', 'code block') },
      { label: 'Link', action: () => applyMarkdown('[', '](https://example.com)', 'link text') },
      { label: 'Clear notes', action: clearNotes, danger: true, disabled: !content },
    ],
    [content]
  )

  function handleChange(event) {
    updateContent(event.target.value)
    setSaveIndicator('Saving...')
  }

  function applyMarkdown(before, after = '', placeholder = '') {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.slice(start, end)
    const insertText = selected || placeholder
    const nextContent = `${content.slice(0, start)}${before}${insertText}${after}${content.slice(end)}`
    const cursorStart = start + before.length
    const cursorEnd = cursorStart + insertText.length

    updateContent(nextContent)
    setSaveIndicator('Saving...')

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  function applyLinePrefix(prefix, placeholder) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = content.lastIndexOf('\n', start - 1) + 1
    const selected = content.slice(lineStart, end)
    const target = selected || placeholder
    const prefixed = target
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
      .join('\n')
    const nextContent = `${content.slice(0, lineStart)}${prefixed}${content.slice(end)}`

    updateContent(nextContent)
    setSaveIndicator('Saving...')

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart + prefix.length, lineStart + prefixed.length)
    })
  }

  function insertBlock(text) {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const nextContent = `${content.slice(0, start)}${text}${content.slice(start)}`
    const cursorPosition = start + text.length

    updateContent(nextContent)
    setSaveIndicator('Saving...')

    window.requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    })
  }

  function clearNotes() {
    updateContent('')
    setSaveIndicator('Draft cleared')
    textareaRef.current?.focus()
  }

  function runTool(tool) {
    if (tool.disabled) return
    tool.action()
    setToolsOpen(false)
  }

  const panelStyle =
    mode === 'panel'
      ? {
          width: '100%',
          minWidth: 0,
          height: '100%',
          minHeight: 0,
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
          padding: '10px 12px',
          borderBottom: '1px solid #E0E0E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          position: 'relative',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A', fontFamily: 'DM Sans, sans-serif' }}>
            My notes
          </div>
          <div style={{ marginTop: '2px', fontSize: '10px', color: '#7A7F90', fontFamily: 'DM Sans, sans-serif' }}>
            {saveIndicator || 'Auto-saved locally'}
          </div>
        </div>

        <div ref={menuRef} style={{ position: 'relative', flex: '0 0 auto' }}>
          <button
            type="button"
            aria-label="Open notes tools"
            aria-expanded={toolsOpen}
            title="Notes tools"
            onClick={() => setToolsOpen((prev) => !prev)}
            style={menuButtonStyle}
          >
            ...
          </button>

          {toolsOpen ? (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 40,
                width: '190px',
                padding: '6px',
                border: '1px solid #D8D8E2',
                borderRadius: '10px',
                background: '#fff',
                boxShadow: '0 14px 32px rgba(26, 26, 26, 0.16)',
              }}
            >
              {tools.map((tool) => (
                <button
                  key={tool.label}
                  type="button"
                  disabled={tool.disabled}
                  onClick={() => runTool(tool)}
                  style={{
                    ...menuItemStyle,
                    color: tool.danger ? '#B54747' : '#1A1A1A',
                    opacity: tool.disabled ? 0.45 : 1,
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        placeholder={'Write markdown notes here...\n\n## Key idea\n- Capture the important points\n- Save permanently from Summary'}
        style={{
          flex: 1,
          minHeight: 0,
          width: '100%',
          padding: '16px 18px',
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontSize: '14px',
          lineHeight: 1.7,
          color: '#1A1A1A',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          background: '#fff',
        }}
      />

      <div
        style={{
          padding: '9px 14px',
          borderTop: '1px solid #E0E0E0',
          fontSize: '11px',
          color: '#7A7F90',
          fontFamily: 'DM Sans, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: '#F8F8FB',
        }}
      >
        <span>Draft only - save permanently at Summary</span>
        <span>
          {stats.words} words | {stats.chars} chars
        </span>
      </div>
    </div>
  )
}

const menuButtonStyle = {
  width: '34px',
  height: '34px',
  padding: 0,
  border: '1px solid #D8D8E2',
  borderRadius: '8px',
  background: '#fff',
  color: '#1A1A1A',
  fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
  boxShadow: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const menuItemStyle = {
  width: '100%',
  minHeight: '32px',
  padding: '7px 9px',
  border: 'none',
  borderRadius: '7px',
  background: '#fff',
  boxShadow: 'none',
  color: '#1A1A1A',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  fontSize: '12px',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 500,
  textAlign: 'left',
}

export default NotesPanel
