'use client'
import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Send, Mic, MicOff, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK = ['Wie war mein Schlaf?', 'Heutiger Fokus?', 'Supplement-Tipp?']

export function LeviWidget() {
  const [open, setOpen]       = useState(false)
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [unread, setUnread]   = useState(1)
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey Julian! Ich bin hier wenn du Fragen hast. 💪' }
  ])
  const bottomRef = useRef<HTMLDivElement>(null)
  const recRef    = useRef<any>(null)

  useEffect(() => {
    if (open) { setUnread(0); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }
  }, [open, messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const updated = [...messages, { role: 'user' as const, content: text }]
    setMessages(updated)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/levi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated }),
      })
      const data = await res.json()
      setMessages(p => [...p, { role: 'assistant', content: data.content }])
      if (!open) setUnread(n => n + 1)
    } catch {
      setMessages(p => [...p, { role: 'assistant', content: 'Kurzer Aussetzer – versuch es nochmal!' }])
    } finally { setLoading(false) }
  }

  const toggleVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    if (listening) { recRef.current?.stop(); setListening(false); return }
    const r = new SR(); r.lang = 'de-DE'; r.interimResults = false
    r.onresult = (e: any) => setInput(e.results[0][0].transcript)
    r.onend = () => setListening(false)
    recRef.current = r; r.start(); setListening(true)
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center levi-gradient"
          >
            <span className="text-white font-bold text-xl">L</span>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-card border-t border-border rounded-t-2xl shadow-2xl"
            style={{ height: '80vh', maxWidth: 480, margin: '0 auto' }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="w-9 h-9 rounded-full levi-gradient flex items-center justify-center text-white font-bold">L</div>
              <div className="flex-1">
                <p className="text-sm font-bold">Levi</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  Online
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Messages */}
            <div className="overflow-y-auto p-4 space-y-3" style={{ height: 'calc(80vh - 180px)' }}>
              {messages.map((m, i) => (
                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full levi-gradient flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">L</div>
                  )}
                  <div className={cn(
                    'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                    m.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary rounded-bl-sm'
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full levi-gradient flex items-center justify-center text-white text-xs font-bold">L</div>
                  <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 pb-2">
              {QUICK.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="flex-shrink-0 text-xs bg-secondary text-muted-foreground px-3 py-1.5 rounded-full border border-border whitespace-nowrap hover:text-foreground transition-colors">
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 p-4 pt-0">
              <button onClick={toggleVoice}
                className={cn('p-2.5 rounded-xl border flex-shrink-0 transition-colors',
                  listening ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-secondary border-border text-muted-foreground'
                )}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send(input)}
                placeholder="Frag Levi..." disabled={loading}
                className="flex-1 bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors" />
              <button onClick={() => send(input)} disabled={!input.trim() || loading}
                className="p-2.5 rounded-xl bg-primary text-primary-foreground flex-shrink-0 disabled:opacity-40 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
