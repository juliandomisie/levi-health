'use client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Moon, Zap, Dumbbell, Droplets, Heart, Brain, TrendingUp, TrendingDown } from 'lucide-react'
import { mockTodayStats, mockLeviGreeting, mockSleepData, mockFitnessData, userName } from '@/lib/mock-data'
import { useState } from 'react'

function ScoreCard({ icon: Icon, label, value, unit, color, sub }: {
  icon: React.ElementType, label: string, value: string | number, unit?: string, color: string, sub?: string
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="flex items-end gap-1">
          <span className={`text-3xl font-bold ${color}`}>{value}</span>
          {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs">
        <p className="text-muted-foreground">{label}</p>
        <p className="text-primary font-bold">{payload[0].value} {payload[0].name}</p>
      </div>
    )
  }
  return null
}

export default function DashboardPage() {
  const [range, setRange] = useState('7')
  const s = mockTodayStats

  return (
    <div className="space-y-5 pb-4">
      {/* Levi Daily Briefing */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">L</div>
            <div>
              <p className="text-xs text-primary font-semibold mb-1">Guten Morgen, {userName}! 🌿</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{mockLeviGreeting}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Biologisches Alter */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Biologisches Alter</p>
              <div className="flex items-end gap-1">
                <span className="text-5xl font-bold text-blue-400">{s.bioAge}</span>
                <span className="text-lg text-muted-foreground mb-1">Jahre</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="w-3 h-3 text-emerald-400" />
                <span className="text-xs text-emerald-400">3 Jahre jünger als Kalenderalter</span>
              </div>
            </div>
            <Brain className="w-12 h-12 text-blue-400/40" />
          </div>
        </CardContent>
      </Card>

      {/* Score-Karten Grid */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreCard icon={Moon}    label="Schlaf"    value={s.sleep.hours} unit="h"   color="text-blue-400"    sub={`HRV ${s.sleep.hrv}ms · Qualität ${s.sleep.quality}/10`} />
        <ScoreCard icon={Heart}   label="HRV"       value={s.sleep.hrv}   unit="ms"  color="text-red-400"     sub="12% über Wochenschnitt" />
        <ScoreCard icon={Zap}     label="Energie"   value={`${s.energy}/10`}          color="text-yellow-400"  sub="Basierend auf Schlaf & HRV" />
        <ScoreCard icon={Droplets}label="Wasser"    value={s.water}       unit="ml"  color="text-cyan-400"    sub={`Ziel: 2500ml`} />
        <ScoreCard icon={Dumbbell}label="Schritte"  value={s.steps.toLocaleString('de')} color="text-emerald-400" sub={`${s.calories.burned} kcal verbrannt`} />
        <ScoreCard icon={TrendingUp} label="Kalorien" value={s.calories.consumed} unit="kcal" color="text-orange-400" sub={`${s.calories.burned} kcal verbrannt`} />
      </div>

      {/* Trend Charts */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-foreground">Trends</h2>
          <Tabs value={range} onValueChange={setRange}>
            <TabsList className="h-7 bg-secondary">
              <TabsTrigger value="7"  className="text-xs px-2 h-5">7T</TabsTrigger>
              <TabsTrigger value="30" className="text-xs px-2 h-5">30T</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Card className="bg-card border-border mb-3">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">Schlaf (Stunden)</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={mockSleepData}>
                <defs>
                  <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[4, 10]} hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="hours" name="h" stroke="#3b82f6" fill="url(#sleepGrad)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-3">Schritte</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={mockFitnessData}>
                <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="steps" name="Schritte" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
