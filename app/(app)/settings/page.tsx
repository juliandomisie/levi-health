'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Settings, Bell, Watch, Download, User } from 'lucide-react'

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(false)
  const [voice, setVoice] = useState(false)
  const [handsfree, setHandsfree] = useState(false)
  const [confirmLog, setConfirmLog] = useState(true)
  const [name, setName] = useState('Julian')

  const requestNotifications = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission()
      setNotifications(perm === 'granted')
    }
  }

  const IOS_SHORTCUT = JSON.stringify({
    name: "Send to Levi Health",
    actions: [
      { type: "get-health-data", metrics: ["HKQuantityTypeIdentifierHeartRate","HKCategoryTypeIdentifierSleepAnalysis","HKQuantityTypeIdentifierActiveEnergyBurned","HKQuantityTypeIdentifierStepCount"] },
      { type: "http-request", method: "POST", url: "https://YOUR-APP.netlify.app/api/health-import", body: "{{ShortcutInput}}" }
    ]
  }, null, 2)

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Einstellungen</h1>
      </div>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" />Profil</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Dein Name (für Levi)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="mt-1 bg-secondary border-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['Alter','20','Jahre'],['Größe','182','cm'],['Gewicht','78','kg']].map(([l,v,u]) => (
              <div key={l}>
                <Label className="text-xs text-muted-foreground">{l}</Label>
                <Input defaultValue={v} className="mt-1 bg-secondary border-border" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Benachrichtigungen</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Push-Benachrichtigungen</Label>
            <Switch checked={notifications} onCheckedChange={() => requestNotifications()} />
          </div>
          {!notifications && (
            <Button size="sm" onClick={requestNotifications} className="w-full bg-primary/20 text-primary border border-primary/30">
              Benachrichtigungen aktivieren
            </Button>
          )}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>🌅 07:30 – Morgen-Briefing von Levi</p>
            <p>💧 12:30 – Wasser-Erinnerung</p>
            <p>🌙 20:00 – Abend-Check-in</p>
          </div>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm">Levi Voice Interface</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: 'Levi spricht Antworten vor', val: voice, set: setVoice },
            { label: 'Hands-free Modus', val: handsfree, set: setHandsfree },
            { label: 'Schnell-Log bestätigen vor Einspeichern', val: confirmLog, set: setConfirmLog },
          ].map(({ label, val, set }) => (
            <div key={label} className="flex items-center justify-between">
              <Label className="text-sm">{label}</Label>
              <Switch checked={val} onCheckedChange={set} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Apple Watch / iOS Shortcut */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Watch className="w-4 h-4" />Apple Watch Integration</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Installiere den iOS Shortcut auf deinem iPhone um Apple Watch Daten (HRV, Schritte, Kalorien, Schlaf) automatisch an Levi zu senden.
          </p>
          <div className="bg-secondary rounded-xl p-3 text-xs font-mono text-muted-foreground overflow-x-auto">
            <p className="text-emerald-400 mb-1">// iOS Shortcut Vorlage</p>
            <pre className="whitespace-pre-wrap">{`POST /api/health-import
{
  "hrv": {{HRV_morgens}},
  "steps": {{Schritte_heute}},
  "calories": {{Kalorien}},
  "sleep_hours": {{Schlaf_h}},
  "date": "{{Datum}}"
}`}</pre>
          </div>
          <Button size="sm" className="w-full bg-secondary hover:bg-secondary/80 text-foreground border border-border">
            📱 Shortcut-Vorlage herunterladen
          </Button>
        </CardContent>
      </Card>

      {/* Export */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Download className="w-4 h-4" />Daten exportieren</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">CSV Export</Button>
          <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">JSON Export</Button>
        </CardContent>
      </Card>
    </div>
  )
}
