import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import CustomerCard from '@/components/CustomerCard'

const SESSION_KEY = 'zap_session_id'
const API_BASE = import.meta.env.VITE_API_URL || ''

function getOrCreateSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY)
  if (!id) {
    id = uuidv4()
    sessionStorage.setItem(SESSION_KEY, id)
  }
  return id
}

const WELCOME_MESSAGE = {
  role: 'bot',
  text: 'שלום וברוכים הבאים לזאפ! 👋\nאני כאן כדי לעזור לך להצטרף לפלטפורמה שלנו.\nאיך קוראים לעסק שלך?',
}

function TypingIndicator() {
  return (
    <div className="msg-animate flex items-end gap-2.5 max-w-[78%]" style={{ alignSelf: 'flex-start', direction: 'ltr' }}>
      <BotAvatar />
      <div className="bg-white border border-slate-100 shadow-sm px-4 py-3.5 rounded-[20px_20px_20px_5px] flex items-center gap-1.5 min-w-[58px]">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function BotAvatar() {
  return (
    <div
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-white text-[13px] font-black tracking-wider shadow-md"
      style={{
        background: 'linear-gradient(135deg, #ff6600 0%, #cc4400 100%)',
        boxShadow: '0 2px 8px rgba(255,102,0,0.35)',
      }}
    >
      Z
    </div>
  )
}

function UserAvatar() {
  return (
    <div
      className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold shadow-sm"
      style={{
        background: 'linear-gradient(135deg, #e8edf3 0%, #d0d9e4 100%)',
        color: '#4a5568',
      fontSize: '11px',
    }}
    >
      את/ה
    </div>
  )
}

function MessageBubble({ msg, index }) {
  const isBot = msg.role === 'bot'
  return (
    <div
      className="msg-animate flex items-end gap-2.5 max-w-[78%]"
      style={{
        alignSelf: isBot ? 'flex-start' : 'flex-end',
        flexDirection: isBot ? 'row' : 'row-reverse',
        direction: 'ltr',
        animationDelay: `${Math.min(index * 0.04, 0.2)}s`,
      }}
    >
      {isBot ? (
        <>
          <BotAvatar />
          <div
            className="px-4 py-3 text-[0.93rem] leading-relaxed break-words whitespace-pre-wrap"
            style={{
              background: 'white',
              color: '#0f1c2e',
              borderRadius: '20px 20px 20px 5px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 1px 6px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)',
              direction: 'rtl',
            }}
          >
            {msg.text.split('\n').map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </div>
        </>
      ) : (
        <>
          <UserAvatar />
          <div
            className="px-4 py-3 text-[0.93rem] leading-relaxed break-words whitespace-pre-wrap"
            style={{
              background: 'linear-gradient(135deg, #ff6600 0%, #e05200 100%)',
              color: 'white',
              borderRadius: '20px 20px 5px 20px',
              boxShadow: '0 2px 8px rgba(255,102,0,0.3), 0 4px 16px rgba(255,102,0,0.15)',
              direction: 'rtl',
            }}
          >
            {msg.text.split('\n').map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ChatBot() {
  const [sessionId, setSessionId] = useState(getOrCreateSessionId)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [customer, setCustomer] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading, customer])

  useEffect(() => {
    if (!loading && !complete) inputRef.current?.focus()
  }, [loading, complete])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading || complete) return

    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      })
      if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`)
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'bot', text: data.reply }])
      if (data.onboarding_complete) {
        setComplete(true)
        if (data.customer) setCustomer(data.customer)
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'bot', text: `מצטערים, אירעה שגיאה. אנא נסה שנית.\n(${err.message})` },
      ])
    } finally {
      setLoading(false)
    }
  }

  function startNewChat() {
    const newId = uuidv4()
    sessionStorage.setItem(SESSION_KEY, newId)
    setSessionId(newId)
    setMessages([WELCOME_MESSAGE])
    setInput('')
    setComplete(false)
    setCustomer(null)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div
      className="flex flex-col h-dvh"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)' }}
    >
      {/* Header */}
      <header
        className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #0f1c2e 0%, #162338 60%, #1a2d47 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Logo mark */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #ff6600 0%, #cc4400 100%)',
              boxShadow: '0 2px 12px rgba(255,102,0,0.4)',
            }}
          >
            Z
          </div>
          <div className="flex flex-col leading-none gap-0.5">
            <span className="text-white font-extrabold text-xl tracking-wide" style={{ letterSpacing: '0.06em' }}>
              ZAP
            </span>
            <span className="text-slate-400 text-[0.72rem] font-medium tracking-wide">
              הצטרפות עסקים
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status */}
          <div className="flex items-center gap-2 bg-white/5 rounded-full px-3 py-1.5 border border-white/10">
            <span
              className="status-dot w-2 h-2 rounded-full bg-emerald-400"
              style={{ boxShadow: '0 0 6px rgba(52,211,153,0.7)' }}
            />
            <span className="text-slate-300 text-[0.72rem] font-medium">מחובר</span>
          </div>
          {/* Admin link */}
          <Link
            to="/admin"
            className="text-slate-400 text-[0.72rem] font-medium bg-white/5 rounded-full px-3 py-1.5 border border-white/10 hover:text-white hover:bg-white/10 transition-colors"
          >
            ניהול חברות קיימות
          </Link>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea
        className="flex-1"
        dir="rtl"
        style={{ background: '#f0f2f5' }}
      >
        <div className="flex flex-col gap-3 p-5 pb-3 items-stretch" style={{ direction: 'ltr' }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} index={i} />
          ))}
          {loading && <TypingIndicator />}
          {complete && customer && <CustomerCard customer={customer} />}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <footer
        className="shrink-0 px-4 py-3"
        style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.05)',
        }}
      >
        {complete ? (
          <div className="flex flex-col gap-2">
            <div
              className="text-center font-semibold text-[0.9rem] py-3 px-4 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #e8f5e9 0%, #f1fdf3 100%)',
                color: '#1e7e34',
                border: '1px solid rgba(52,168,83,0.2)',
              }}
            >
              ✅ תהליך ההצטרפות הושלם בהצלחה! נחזור אליך בקרוב.
            </div>
            <button
              onClick={startNewChat}
              className="w-full text-center font-semibold text-[0.88rem] py-2.5 px-4 rounded-xl transition-all duration-150 active:scale-95 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #0f1c2e 0%, #1a2d47 100%)',
                color: 'white',
                border: 'none',
              }}
            >
              + התחל שיחה חדשה
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              size="icon"
              className="send-btn w-11 h-11 rounded-full shrink-0 text-white transition-all duration-150 active:scale-90 cursor-pointer border-0"
              style={{
                background: input.trim() && !loading
                  ? 'linear-gradient(135deg, #ff6600 0%, #e05200 100%)'
                  : '#d1d5db',
                boxShadow: input.trim() && !loading
                  ? '0 2px 10px rgba(255,102,0,0.4)'
                  : 'none',
                transition: 'background 0.2s, box-shadow 0.2s, transform 0.15s',
              }}
              aria-label="שלח"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="הקלד הודעה..."
              disabled={loading}
              dir="auto"
              className="flex-1 font-[inherit] text-[0.93rem] h-[46px] placeholder:text-slate-400 placeholder:text-right bg-white"
              style={{
                borderRadius: '23px',
                border: '1.5px solid #e2e6ea',
                paddingInlineStart: '18px',
                paddingInlineEnd: '18px',
                outline: 'none',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#ff6600'
                e.target.style.boxShadow = '0 0 0 3px rgba(255,102,0,0.12)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e2e6ea'
                e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
              }}
            />
          </div>
        )}
      </footer>
    </div>
  )
}
