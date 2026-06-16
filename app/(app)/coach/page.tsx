'use client'
import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, Mic, MicOff, Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string; time: string }

const SUGGESTIONS = [
  'Wie kann ich meine HRV verbessern?',
  'Was bedeutet mein Vitamin D Wert?',
  'Welche Supplement-Basics empfiehlst du?',
  'Wie optimiere ich meinen Schlaf?',
  'Was ist Zone 2 Training?',
]

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hey Julian! 👋 Ich bin Levi, dein persönlicher Health Coach. Ich kenne deine Daten und helfe dir dabei, länger gesünder zu leben. Was beschäftigt dich heute?',
      time: now(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  function now() {
    return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text, time: now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/levi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg].map(m => ({ role: m.role, content: m.content })) }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content, time: now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Entschuldigung, ich hatte einen kurzen Aussetzer. Bitte versuche es nochmal.', time: now() }])
    } finally {
      setLoading(false)
    }
  }

  const toggleVoice = () => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Spracherkennung wird von diesem Browser nicht unterstützt.'); return }

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const r = new SR()
    r.lang = 'de-DE'
    r.interimResults = false
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript) }
    r.onend = () => setListening(false)
    recognitionRef.current = r
    r.start()
    setListening(true)
  }

  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'de-DE'; u.rate = 0.95
    const voices = speechSynthesis.getVoices()
    u.voice = voices.find(v => v.lang.startsWith('de')) || voices[0]
    speechSynthesis.speak(u)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)] pb-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">L</div>
        <h1 className="text-xl font-bold">Levi Coach</h1>
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse ml-auto" />
        <span className="text-xs text-emerald-400">Online</span>
      </div>

      <ScrollArea className="flex-1 mb-3">
        <div className="space-y-3 pr-1">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">L</div>
              )}
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border rounded-bl-sm'
              )}>
                <p>{m.content}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] opacity-50">{m.time}</span>
                  {m.role === 'assistant' && (
                    <button onClick={() => speak(m.content)} className="opacity-40 hover:opacity-80 transition-opacity ml-1">
                      <Volume2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">L</div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Suggestions */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide mb-3 pb-1">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => sendMessage(s)}
            className="flex-shrink-0 text-xs bg-secondary hover:bg-secondary/80 text-muted-foreground px-3 py-1.5 rounded-full border border-border transition-colors whitespace-nowrap">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <button onClick={toggleVoice}
          className={cn('p-2.5 rounded-xl border transition-colors flex-shrink-0',
            listening ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'
          )}>
          {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="Frag Levi etwas..." disabled={loading}
          className="flex-1 bg-secondary border-border" />
        <Button onClick={() => sendMessage(input)} disabled={!input.trim() || loading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-3 flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
