'use client'
import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlarmClock, Moon, Volume2, X, Play } from 'lucide-react'

const TONES = [
  { key: 'glocke', label: 'Glocke',   desc: 'Weiche Glockentöne' },
  { key: 'morgen', label: 'Morgen',   desc: 'Aufhellende Melodie' },
  { key: 'puls',   label: 'Puls',     desc: 'Ruhiger Herzschlag' },
  { key: 'natur',  label: 'Natur',    desc: 'Sanftes Rauschen' },
]

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

function createTone(ctx: AudioContext, type: string, vol: number) {
  const master = ctx.createGain()
  master.gain.value = Math.min(vol, 1)
  master.connect(ctx.destination)
  const t = ctx.currentTime

  if (type === 'glocke') {
    [528, 660, 792].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      env.gain.setValueAtTime(0, t + i * 0.6)
      env.gain.linearRampToValueAtTime(1, t + i * 0.6 + 0.01)
      env.gain.exponentialRampToValueAtTime(0.001, t + i * 0.6 + 2.5)
      osc.connect(env); env.connect(master)
      osc.start(t + i * 0.6); osc.stop(t + i * 0.6 + 2.5)
    })
  } else if (type === 'morgen') {
    [261, 294, 329, 392, 523].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = freq
      const st = t + i * 0.35
      env.gain.setValueAtTime(0, st)
      env.gain.linearRampToValueAtTime(1, st + 0.08)
      env.gain.exponentialRampToValueAtTime(0.001, st + 0.9)
      osc.connect(env); env.connect(master)
      osc.start(st); osc.stop(st + 0.9)
    })
  } else if (type === 'puls') {
    [1, 2].forEach(i => {
      const osc = ctx.createOscillator()
      const env = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = 80
      const st = t + (i - 1) * 0.4
      env.gain.setValueAtTime(0, st)
      env.gain.linearRampToValueAtTime(1, st + 0.05)
      env.gain.exponentialRampToValueAtTime(0.001, st + 0.35)
      osc.connect(env); env.connect(master)
      osc.start(st); osc.stop(st + 0.35)
    })
  } else {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    const src = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'; filter.frequency.value = 500; filter.Q.value = 0.3
    src.buffer = buffer; src.connect(filter); filter.connect(master)
    src.start(); src.stop(t + 3)
  }
}

export default function AlarmPage() {
  const [alarmTime, setAlarmTime]     = useState('07:00')
  const [selectedTone, setSelectedTone] = useState('glocke')
  const [volume, setVolume]           = useState(0.4)
  const [isActive, setIsActive]       = useState(false)
  const [ringing, setRinging]         = useState(false)
  const [optimalTimes, setOptimalTimes] = useState<{time: string; cycles: number}[]>([])
  const [now, setNow]                 = useState('')
  const [notifGranted, setNotifGranted] = useState(false)

  const audioCtxRef  = useRef<AudioContext | null>(null)
  const ringRef      = useRef<NodeJS.Timeout | null>(null)
  const volRef       = useRef(volume)
  const checkRef     = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    volRef.current = volume
  }, [volume])

  useEffect(() => {
    setAlarmTime(load('levi_alarm_time', '07:00'))
    setSelectedTone(load('levi_alarm_tone', 'glocke'))
    setVolume(load('levi_alarm_volume', 0.4))
    setIsActive(load('levi_alarm_active', false))
    calcOptimal()
    if ('Notification' in window) setNotifGranted(Notification.permission === 'granted')
    const iv = setInterval(() => {
      setNow(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }, 1000)
    setNow(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    return () => clearInterval(iv)
  }, [])

  // Restore active alarm on mount
  useEffect(() => {
    if (isActive) scheduleCheck(alarmTime)
  }, [isActive]) // eslint-disable-line

  const calcOptimal = () => {
    const base = Date.now() + 15 * 60 * 1000
    setOptimalTimes([4, 5, 6].map(cycles => {
      const d = new Date(base + cycles * 90 * 60 * 1000)
      return { time: d.toTimeString().slice(0, 5), cycles }
    }))
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
    if (selectedTone === 'puls') setTimeout(() => createTone(ctx, 'puls', volume), 900)
  }

  const scheduleCheck = (time: string) => {
    if (checkRef.current) clearInterval(checkRef.current)
    checkRef.current = setInterval(() => {
      const now = new Date()
      const cur = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
      if (cur === time) {
        clearInterval(checkRef.current!)
        triggerAlarm()
      }
    }, 10000)

    // Also schedule via Service Worker for background
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SCHEDULE_ALARM', time })
    }
  }

  const triggerAlarm = () => {
    setRinging(true)
    setIsActive(false)
    localStorage.setItem('levi_alarm_active', JSON.stringify(false))
    let vol = 0.08
    const ctx = getCtx()
    const ring = () => createTone(ctx, selectedTone, vol)
    ring()
    ringRef.current = setInterval(() => {
      vol = Math.min(vol + 0.04, 0.95)
      ring()
    }, selectedTone === 'glocke' ? 2200 : selectedTone === 'morgen' ? 2000 : selectedTone === 'puls' ? 1800 : 3500)
  }

  const startAlarm = async () => {
    if (!notifGranted && 'Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotifGranted(perm === 'granted')
    }
    localStorage.setItem('levi_alarm_time', JSON.stringify(alarmTime))
    localStorage.setItem('levi_alarm_tone', JSON.stringify(selectedTone))
    localStorage.setItem('levi_alarm_volume', JSON.stringify(volume))
    localStorage.setItem('levi_alarm_active', JSON.stringify(true))
    setIsActive(true)
    scheduleCheck(alarmTime)
  }

  const stopAlarm = () => {
    if (checkRef.current) clearInterval(checkRef.current)
    if (ringRef.current) clearInterval(ringRef.current)
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    localStorage.setItem('levi_alarm_active', JSON.stringify(false))
    setIsActive(false)
    setRinging(false)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_ALARM' })
    }
  }

  const saveSettings = () => {
    localStorage.setItem('levi_alarm_time', JSON.stringify(alarmTime))
    localStorage.setItem('levi_alarm_tone', JSON.stringify(selectedTone))
    localStorage.setItem('levi_alarm_volume', JSON.stringify(volume))
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlarmClock className="w-5 h-5 text-emerald-400" />
          <h1 className="text-xl font-bold">Wecker</h1>
        </div>
        <span className="text-xl font-mono text-muted-foreground">{now}</span>
      </div>

      {/* Main alarm card */}
      <Card className={`border-2 transition-all ${ringing ? 'border-emerald-400 bg-emerald-500/10' : isActive ? 'border-emerald-500/50 bg-emerald-500/5' : 'bg-card border-border'}`}>
        <CardContent className="p-6 text-center">
          {ringing ? (
            <>
              <p className="text-emerald-400 text-sm font-medium mb-2 animate-pulse">🌅 Aufwachen!</p>
              <p className="text-5xl font-mono font-bold text-emerald-400 mb-4">{alarmTime}</p>
              <Button onClick={stopAlarm} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10">
                <X className="w-5 h-5 mr-2" />Abstellen
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">Weckzeit</p>
              <input type="time" value={alarmTime}
                onChange={e => { setAlarmTime(e.target.value); saveSettings() }}
                disabled={isActive}
                className="text-5xl font-mono font-bold bg-transparent text-center text-foreground border-none outline-none w-full" />
              <div className="mt-4">
                {isActive ? (
                  <Button onClick={stopAlarm} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 px-8">
                    <X className="w-4 h-4 mr-2" />Deaktivieren
                  </Button>
                ) : (
                  <Button onClick={startAlarm} className="bg-emerald-600 hover:bg-emerald-700 text-white px-10">
                    <AlarmClock className="w-4 h-4 mr-2" />Wecker stellen
                  </Button>
                )}
              </div>
              {isActive && <p className="text-xs text-emerald-400 mt-3">Aktiv · klingelt um {alarmTime}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {/* Smart wake */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-400" />Optimale Weckzeiten (jetzt einschlafen)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {optimalTimes.map(({ time, cycles }) => (
              <button key={time} onClick={() => { setAlarmTime(time); saveSettings() }}
                className={`flex flex-col items-center p-3 rounded-xl border transition-colors ${
                  alarmTime === time ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-border bg-secondary text-foreground'}`}>
                <span className="text-lg font-mono font-bold">{time}</span>
                <span className="text-[10px] text-muted-foreground">{cycles * 1.5}h · {cycles} Zyklen</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={calcOptimal} className="w-full text-xs text-muted-foreground border-border">
            Neu berechnen
          </Button>
        </CardContent>
      </Card>

      {/* Tone */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="w-4 h-4" />Weckton
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {TONES.map(t => (
              <button key={t.key} onClick={() => { setSelectedTone(t.key); saveSettings() }}
                className={`flex flex-col items-start p-3 rounded-xl border transition-colors text-left ${
                  selectedTone === t.key ? 'border-emerald-500 bg-emerald-500/10' : 'border-border bg-secondary'}`}>
                <span className={`text-sm font-medium ${selectedTone === t.key ? 'text-emerald-400' : 'text-foreground'}`}>{t.label}</span>
                <span className="text-[10px] text-muted-foreground">{t.desc}</span>
              </button>
            ))}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Startlautstärke (steigt automatisch an)</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input type="range" min="0.05" max="1" step="0.05" value={volume}
              onChange={e => { setVolume(+e.target.value); saveSettings() }}
              className="w-full accent-emerald-500" />
          </div>
          <Button onClick={previewTone} variant="outline" size="sm"
            className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
            <Play className="w-3 h-3 mr-2" />Ton testen
          </Button>
        </CardContent>
      </Card>

      <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Hinweis</p>
        <p>Der Ton spielt wenn die App geöffnet ist. Die Benachrichtigung (Vibration + Popup) funktioniert auch wenn die App im Hintergrund läuft — iOS beendet JavaScript im Hintergrund, daher immer die App aktiv lassen oder die Uhr-App zusätzlich nutzen.</p>
      </div>
    </div>
  )
}
