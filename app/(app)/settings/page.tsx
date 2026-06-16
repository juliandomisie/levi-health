'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Bell, Watch, Download, User, Target, Clock } from 'lucide-react'

const FITNESS_GOALS = [
  { key: 'aufbau', label: 'Muskelaufbau', surplus: 300, emoji: '💪' },
  { key: 'halten', label: 'Gewicht halten', surplus: 0, emoji: '⚖️' },
  { key: 'defizit', label: 'Kaloriendefizit', surplus: -400, emoji: '🔥' },
]

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

export default function SettingsPage() {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [fitnessGoal, setFitnessGoal] = useState('halten')
  const [notifications, setNotifications] = useState(false)
  const [notifTimes, setNotifTimes] = useState({ morning: '07:30', water: '12:30', evening: '20:00' })
  const [voice, setVoice] = useState(false)
  const [handsfree, setHandsfree] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setName(load('levi_name', ''))
    setAge(load('levi_age', ''))
    setHeight(load('levi_height', ''))
    setWeight(load('levi_weight', ''))
    setFitnessGoal(load('levi_fitness_goal', 'halten'))
    setNotifications(load('levi_notifications', false))
    setNotifTimes(load('levi_notif_times', { morning: '07:30', water: '12:30', evening: '20:00' }))
    setVoice(load('levi_voice', false))
    setHandsfree(load('levi_handsfree', false))
  }, [])

  const save = () => {
    localStorage.setItem('levi_name', JSON.stringify(name))
    localStorage.setItem('levi_age', JSON.stringify(age))
    localStorage.setItem('levi_height', JSON.stringify(height))
    localStorage.setItem('levi_weight', JSON.stringify(weight))
    localStorage.setItem('levi_fitness_goal', JSON.stringify(fitnessGoal))
    localStorage.setItem('levi_notif_times', JSON.stringify(notifTimes))
    localStorage.setItem('levi_voice', JSON.stringify(voice))
    localStorage.setItem('levi_handsfree', JSON.stringify(handsfree))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleNotifications = async () => {
    if (!notifications) {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') {
          setNotifications(true)
          localStorage.setItem('levi_notifications', JSON.stringify(true))
        }
      }
    } else {
      setNotifications(false)
      localStorage.setItem('levi_notifications', JSON.stringify(false))
    }
  }

  const toggleVoice = (val: boolean) => {
    setVoice(val)
    localStorage.setItem('levi_voice', JSON.stringify(val))
  }

  const toggleHandsfree = (val: boolean) => {
    setHandsfree(val)
    localStorage.setItem('levi_handsfree', JSON.stringify(val))
  }

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Einstellungen</h1>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Profil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name (für Levi)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" className="mt-1 bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Alter</Label>
              <Input value={age} onChange={e => setAge(e.target.value)} placeholder="20" type="number" className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Größe (cm)</Label>
              <Input value={height} onChange={e => setHeight(e.target.value)} placeholder="182" type="number" className="mt-1 bg-secondary border-border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Gewicht (kg)</Label>
              <Input value={weight} onChange={e => setWeight(e.target.value)} placeholder="78" type="number" className="mt-1 bg-secondary border-border" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fitness Goal */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-emerald-400" />Fitnessziel & Kalorienziel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {FITNESS_GOALS.map(g => (
              <button key={g.key} onClick={() => setFitnessGoal(g.key)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-colors text-center ${
                  fitnessGoal === g.key
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}>
                <span className="text-xl">{g.emoji}</span>
                <span className="text-xs font-medium">{g.label}</span>
                <span className="text-[10px] opacity-70">
                  {g.surplus > 0 ? `+${g.surplus}` : g.surplus === 0 ? 'Erhalt' : `${g.surplus}`} kcal
                </span>
              </button>
            ))}
          </div>
          {weight && (
            <div className="bg-secondary rounded-xl p-3 text-xs text-center">
              <p className="text-muted-foreground">Empfohlenes Kalorienziel</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {Math.round((10 * +weight + 6.25 * +(height || 175) - 5 * +(age || 20) + 5) * 1.55 +
                  (FITNESS_GOALS.find(g => g.key === fitnessGoal)?.surplus ?? 0))} kcal
              </p>
              <p className="text-muted-foreground text-[10px] mt-0.5">Mifflin-St-Jeor · moderat aktiv</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Benachrichtigungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Push-Benachrichtigungen</Label>
            <Switch checked={notifications} onCheckedChange={toggleNotifications} />
          </div>
          {notifications && (
            <div className="space-y-2 pt-1">
              {[
                { key: 'morning', emoji: '🌅', label: 'Morgen-Briefing' },
                { key: 'water',   emoji: '💧', label: 'Wasser-Erinnerung' },
                { key: 'evening', emoji: '🌙', label: 'Abend-Check-in' },
              ].map(({ key, emoji, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{emoji} {label}</span>
                  <Input
                    type="time"
                    value={notifTimes[key as keyof typeof notifTimes]}
                    onChange={e => setNotifTimes(p => ({ ...p, [key]: e.target.value }))}
                    className="w-24 text-xs bg-secondary border-border h-7"
                  />
                </div>
              ))}
            </div>
          )}
          {!notifications && (
            <p className="text-xs text-muted-foreground">Aktiviere Benachrichtigungen um Erinnerungszeiten einzustellen.</p>
          )}
        </CardContent>
      </Card>

      {/* Voice */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Levi Voice Interface</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Levi spricht Antworten vor</Label>
            <Switch checked={voice} onCheckedChange={toggleVoice} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Hands-free Modus</Label>
            <Switch checked={handsfree} onCheckedChange={toggleHandsfree} />
          </div>
        </CardContent>
      </Card>

      {/* Apple Watch */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Watch className="w-4 h-4" />Apple Watch Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Shortcut URL-Format (letzter Schritt):</p>
            <p className="font-mono text-[10px] break-all text-emerald-400">
              https://levi-health.netlify.app/import?hrv=WERT&steps=WERT&calories=WERT&heart_rate=WERT&sleep_hours=WERT&workout_minutes=WERT
            </p>
            <p className="text-[10px]">Im Shortcut: "URL öffnen" als letzter Schritt — ersetze WERT durch die jeweiligen Health-Variablen</p>
          </div>
          <a href="shortcuts://import-shortcut?url=https%3A%2F%2Flevi-health.netlify.app%2Flevi-shortcut.shortcut&name=Levi%20Update">
            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              Shortcut-Vorlage öffnen
            </Button>
          </a>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" />Daten exportieren</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="border-border text-muted-foreground">CSV Export</Button>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground">JSON Export</Button>
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={save} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
        {saved ? '✓ Gespeichert' : 'Einstellungen speichern'}
      </Button>
    </div>
  )
}
