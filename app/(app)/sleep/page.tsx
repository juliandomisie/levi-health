'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Moon, Heart, Save, TrendingUp } from 'lucide-react'
import { mockSleepData, mockHRVTrend } from '@/lib/mock-data'

export default function SleepPage() {
  const [bedtime, setBedtime]   = useState('23:00')
  const [waketime, setWaketime] = useState('07:00')
  const [hrv, setHrv]           = useState('')
  const [quality, setQuality]   = useState<number[]>([7])
  const [saved, setSaved]       = useState(false)

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  const hrs = (() => {
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = waketime.split(':').map(Number)
    let diff = (wh * 60 + wm) - (bh * 60 + bm)
    if (diff < 0) diff += 1440
    return (diff / 60).toFixed(1)
  })()

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center gap-2">
        <Moon className="w-5 h-5 text-blue-400" />
        <h1 className="text-xl font-bold">Schlaf</h1>
      </div>

      {/* Log Entry */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Heute eintragen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Einschlafen</Label>
              <Input type="time" value={bedtime} onChange={e => setBedtime(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Aufwachen</Label>
              <Input type="time" value={waketime} onChange={e => setWaketime(e.target.value)}
                className="mt-1 bg-secondary border-border text-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
            <span className="text-sm text-muted-foreground">Schlafdauer</span>
            <span className="text-2xl font-bold text-blue-400">{hrs}h</span>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">HRV morgens (ms)</Label>
            <Input type="number" value={hrv} onChange={e => setHrv(e.target.value)}
              placeholder="z.B. 65" className="mt-1 bg-secondary border-border text-foreground" />
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Schlafqualität</Label>
              <span className="text-sm font-bold text-blue-400">{quality[0]}/10</span>
            </div>
            <Slider value={quality} onValueChange={(v) => setQuality(v as number[])} min={1} max={10} step={1}
              className="[&_[role=slider]]:bg-blue-400" />
          </div>

          <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
            {saved ? '✓ Gespeichert!' : <><Save className="w-4 h-4 mr-2" />Eintragen</>}
          </Button>
        </CardContent>
      </Card>

      {/* HRV Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-400" />
            <CardTitle className="text-sm">HRV Verlauf (30 Tage)</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={mockHRVTrend}>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false}
                interval={6} />
              <YAxis domain={[40, 100]} hide />
              <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="hrv" stroke="#ef4444" strokeWidth={2} dot={false} name="HRV (ms)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly sleep chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            <CardTitle className="text-sm">Schlaf letzte 7 Tage</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={mockSleepData}>
              <defs>
                <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[4, 10]} hide />
              <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="url(#sg)" strokeWidth={2} dot={false} name="Stunden" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
