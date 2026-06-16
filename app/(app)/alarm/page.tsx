'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlarmClock, Moon, Volume2, X, Play } from 'lucide-react'

const TONES = [
  { key: 'natur',   label: 'Natur',    desc: 'Sanftes Rauschen' },
  { key: 'glocke',  label: 'Glocke',   desc: 'Weiche Glockentöne' },
  { key: 'puls',    label: 'Puls',     desc: 'Ruhiger Herzschlag' },
  { key: 'morgen',  label: 'Morgen',   desc: 'Aufhellende Melodie' },
]

const SLEEP_CYCLES = [4, 5, 6] // 6h, 7.5h, 9h

function createTone(ctx: AudioContext, type: string, volume: number) {
  const master = ctx.createGain()
  master.gain.value = volume
  master.connect(ctx.destination)

  if (type === 'glocke') {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 528
    env.gain.setValueAtTime(0, ctx.currentTime)
    env.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.01)
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)
    osc.connect(env); env.connect(master)
    osc.start(); osc.stop(ctx.currentTime + 2)
  } else if (type === 'puls') {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 60
    env.gain.setValueAtTime(1, ctx.currentTime)
    env.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3)
    osc.connect(env); env.connect(master)
    osc.start(); osc.stop(ctx.currentTime + 0.3)
  } else if (type === 'morgen') {
    [261, 329, 392, 523].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.4
      env.gain.setValueAtTime(0, t)
      env.gain.linearRampToValueAtTime(1, t + 0.1)
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.8)
      osc.connect(env); env.connect(master)
      osc.start(t); osc.stop(t + 0.8)
    })
  } else {
    // natur: filtered noise
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'; filter.frequency.value = 400; filter.Q.value = 0.5
    source.buffer = buffer
    source.connect(filter); filter.connect(master)
    source.start(); source.stop(ctx.currentTime + 2)
  }
}

export default function AlarmPage() {
  const [alarmTime, setAlarmTime] = useState('07:00')
  const [selectedTone, setSelectedTone] = useState('glocke')
  const [isActive, setIsActive] = useState(false)
  const [ringing, setRinging] = useState(false)
  const [sleepNow, setSleepNow] = useState(false)
  const [optimalTimes, setOptimalTimes] = useState<string[]>([])
  const [volume, setVolume] = useState(0.3)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const rampRef = useRef<NodeJS.Timeout | null>(null)
  const checkRef = useRef<NodeJS.Timeout | null>(null)
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    calcOptimal()
  }, [])

  const calcOptimal = () => {
    const now = new Date()
    const times = SLEEP_CYCLES.map(cycles => {
      const wake = new Date(now.getTime() + cycles * 90 * 60 * 1000 + 15 * 60 * 1000)
      return wake.toTimeString().slice(0, 5)
    })
    setOptimalTimes(times)
  }

  const getCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioContext()
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume()
    return audioCtxRef.current
  }

  const previewTone = () => {
    const ctx = getCtx()
    createTone(ctx, selectedTone, volume)
    if (selectedTone === 'puls') {
      let i = 0
      const iv = setInterval(() => {
        createTone(ctx, 'puls', volume)
        if (++i >= 4) clearInterval(iv)
      }, 800)
    }
  }

  const startAlarm = () => {
    setIsActive(true)
    checkRef.current = setInterval(() => {
      const now = new Date()
      const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      if (current === alarmTime) {
        clearInterval(checkRef.current!)
        triggerAlarm()
      }
    }, 10000)
  }

  const triggerAlarm = () => {
    setRinging(true)
    let vol = 0.05
    const ctx = getCtx()

    const ring = () => createTone(ctx, selectedTone, vol)
    ring()
    ringIntervalRef.current = setInterval(() => {
      ring()
      if (selectedTone === 'puls') setTimeout(() => ring(), 800)
    }, selectedTone === 'puls' ? 1600 : selectedTone === 'glocke' ? 2500 : selectedTone === 'morgen' ? 2200 : 3000)

    rampRef.current = setInterval(() => {
      vol = Math.min(vol + 0.05, 0.9)
    }, 60000)
  }

  const stopAlarm = () => {
    if (checkRef.current) clearInterval(checkRef.current)
    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current)
    if (rampRef.current) clearInterval(rampRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    setIsActive(false)
    setRinging(false)
  }

  const [now, setNow] = useState('')
  useEffect(() => {
    const update = () => setNow(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold">Wecker</h1>
        </div>
        <span className="text-2xl font-mono text-muted-foreground">{now}</span>
      </div>

      {/* Alarm Time */}
      <Card className={`border-2 transition-colors ${ringing ? 'border-emerald-400 bg-emerald-500/10' : 'bg-card border-border'}`}>
        <CardContent className="p-6 text-center">
          {ringing ? (
            <>
              <p className="text-emerald-400 text-sm font-medium mb-2">Aufwachen! 🌅</p>
              <p className="text-5xl font-mono font-bold text-emerald-400 mb-4">{alarmTime}</p>
              <Button onClick={stopAlarm} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10">
                <X className="w-5 h-5 mr-2" />Abstellen
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">Weckzeit</p>
              <input
                type="time"
                value={alarmTime}
                onChange={e => setAlarmTime(e.target.value)}
                disabled={isActive}
                className="text-5xl font-mono font-bold bg-transparent text-center text-foreground border-none outline-none w-full"
              />
              <div className="mt-4">
                {isActive ? (
                  <Button onClick={stopAlarm} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 px-8">
                    <X className="w-4 h-4 mr-2" />Wecker deaktivieren
                  </Button>
                ) : (
                  <Button onClick={startAlarm} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10">
                    <AlarmClock className="w-4 h-4 mr-2" />Wecker stellen
                  </Button>
                )}
              </div>
              {isActive && (
                <p className="text-xs text-emerald-400 mt-3">Aktiv — klingelt um {alarmTime}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Smart Wake */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />
            Optimale Schlafzyklen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Jetzt einschlafen → aufwachen nach vollständigen Schlafzyklen (90 min + 15 min Einschlafen):
          </p>
          <div className="grid grid-cols-3 gap-2">
            {optimalTimes.map((t, i) => (
              <button key={t} onClick={() => setAlarmTime(t)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${
                  alarmTime === t ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-border bg-secondary text-foreground'}`}>
                <span className="text-lg font-mono font-bold">{t}</span>
                <span className="text-[10px] text-muted-foreground">{SLEEP_CYCLES[i] * 1.5}h Schlaf</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={calcOptimal} className="w-full border-border text-muted-foreground text-xs">
            Zeiten neu berechnen
          </Button>
        </CardContent>
      </Card>

      {/* Tone Selection */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Weckton
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button key={t.key} onClick={() => setSelectedTone(t.key)}
                className={`flex flex-col items-start p-3 rounded-xl border transition-colors text-left ${
                  selectedTone === t.key ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-secondary'}`}>
                <span className={`text-sm font-medium ${selectedTone === t.key ? 'text-emerald-400' : 'text-foreground'}`}>{t.label}</span>
                <span className="text-[10px] text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>

          {/* Volume */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Lautstärke (progressiv ansteigend)</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input type="range" min="0.05" max="1" step="0.05" value={volume}
              onChange={e => setVolume(+e.target.value)}
              className="w-full accent-emerald-500" />
            <p className="text-[10px] text-muted-foreground">Startet leise, wird alle 60s lauter bis 90%</p>
          </div>

          <Button onClick={previewTone} variant="outline" size="sm" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
            <Play className="w-3 h-3 mr-2" />Ton testen
          </Button>
        </CardContent>
      </Card>

      <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Hinweis</p>
        <p>Der Wecker funktioniert nur wenn die App geöffnet ist. Für einen zuverlässigen Wecker empfehlen wir die iOS Uhr-App zusätzlich zu nutzen.</p>
      </div>
    </div>
  )
}
