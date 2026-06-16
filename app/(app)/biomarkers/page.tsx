'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FlaskConical, Plus, Trash2, Scale } from 'lucide-react'

type Marker = { id: number; name: string; value: number; unit: string; date: string; status: 'good' | 'warn' | 'bad' }
type WeightEntry = { date: string; weight: number; dateKey: string }

const STATUS_COLORS = {
  good: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', badge: 'bg-emerald-500/20 text-emerald-400' },
  warn: { bg: 'bg-yellow-500/10',  text: 'text-yellow-400',  border: 'border-yellow-500/20',  badge: 'bg-yellow-500/20 text-yellow-400' },
  bad:  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20',     badge: 'bg-red-500/20 text-red-400' },
}

const ALL_MARKERS = [
  'Nüchternglukose','HbA1c','Insulin nüchtern','CRP','Homocystein',
  'Vitamin D','Vitamin B12','Ferritin','Eisen','Testosteron',
  'DHEA-S','IGF-1','TSH','LDL','HDL','Triglyceride','ApoB',
  'ALT','AST','GGT','Kreatinin','eGFR','Harnsäure',
]

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') } catch { return fallback }
}

export default function BiomarkersPage() {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [adding, setAdding] = useState(false)
  const [newM, setNewM] = useState({ name: '', value: '', unit: '', status: 'good' as Marker['status'] })
  const [search, setSearch] = useState('')
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([])
  const [weightInput, setWeightInput] = useState('')
  const [weightSaved, setWeightSaved] = useState(false)

  useEffect(() => {
    setMarkers(load<Marker[]>('levi_biomarkers', []))
    setWeightLog(load<WeightEntry[]>('levi_weight_log', []))
  }, [])

  const saveWeight = () => {
    if (!weightInput) return
    const dateKey = new Date().toDateString()
    const date = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
    const entry: WeightEntry = { date, weight: +weightInput, dateKey }
    const existing = weightLog.filter(e => e.dateKey !== dateKey)
    const updated = [entry, ...existing].slice(0, 90)
    setWeightLog(updated)
    localStorage.setItem('levi_weight_log', JSON.stringify(updated))
    setWeightInput('')
    setWeightSaved(true)
    setTimeout(() => setWeightSaved(false), 2000)
  }

  const chartData = [...weightLog].reverse().slice(-30)

  const save = (updated: Marker[]) => {
    setMarkers(updated)
    localStorage.setItem('levi_biomarkers', JSON.stringify(updated))
  }

  const addMarker = () => {
    if (!newM.name || !newM.value) return
    save([...markers, {
      id: Date.now(),
      name: newM.name,
      value: parseFloat(newM.value),
      unit: newM.unit,
      date: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      status: newM.status,
    }])
    setNewM({ name: '', value: '', unit: '', status: 'good' })
    setSearch('')
    setAdding(false)
  }

  const filtered = ALL_MARKERS.filter(m => m.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          <h1 className="text-xl font-bold">Biomarker</h1>
        </div>
        <Button size="sm" onClick={() => setAdding(p => !p)}
          className="bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
          <Plus className="w-3 h-3 mr-1" />Wert eintragen
        </Button>
      </div>

      {/* Weight Tracking */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-400" />Gewicht
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              value={weightInput}
              onChange={e => setWeightInput(e.target.value)}
              placeholder="kg eingeben..."
              className="bg-secondary border-border"
              onKeyDown={e => e.key === 'Enter' && saveWeight()}
            />
            <Button onClick={saveWeight} className="bg-blue-600 hover:bg-blue-700 text-white px-4 shrink-0">
              {weightSaved ? '✓' : 'Speichern'}
            </Button>
          </div>

          {weightLog.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Heute</p>
                  <p className="text-xl font-bold text-blue-400">{weightLog[0]?.weight} kg</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Tiefst (30T)</p>
                  <p className="text-xl font-bold text-emerald-400">{Math.min(...weightLog.slice(0,30).map(e=>e.weight))} kg</p>
                </div>
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Höchst (30T)</p>
                  <p className="text-xl font-bold text-orange-400">{Math.max(...weightLog.slice(0,30).map(e=>e.weight))} kg</p>
                </div>
              </div>

              {chartData.length > 1 && (
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #2a3040', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: unknown) => [`${v} kg`, 'Gewicht']} />
                    <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              <div className="space-y-1 max-h-40 overflow-y-auto">
                {weightLog.slice(0, 10).map((e, i) => (
                  <div key={i} className="flex justify-between items-center bg-secondary rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">{e.date}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-blue-400">{e.weight} kg</span>
                      <button onClick={() => {
                        const updated = weightLog.filter((_, idx) => idx !== i)
                        setWeightLog(updated)
                        localStorage.setItem('levi_weight_log', JSON.stringify(updated))
                      }} className="text-muted-foreground hover:text-red-400">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {weightLog.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">Noch kein Gewicht eingetragen</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {(['good','warn','bad'] as const).map(s => {
          const c = STATUS_COLORS[s]
          const count = markers.filter(m => m.status === s).length
          const label = s === 'good' ? '✓ Optimal' : s === 'warn' ? '⚠ Optimierbar' : '✗ Kritisch'
          return (
            <Card key={s} className={`${c.bg} ${c.border} border`}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${c.text}`}>{count}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Add form */}
      {adding && (
        <Card className="bg-card border-primary/30">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Marker suchen..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-secondary border-border" />
            {search && filtered.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1 bg-secondary rounded-xl p-2">
                {filtered.map(m => (
                  <button key={m} onClick={() => { setNewM(p => ({...p, name: m})); setSearch('') }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-card transition-colors">
                    {m}
                  </button>
                ))}
              </div>
            )}
            {newM.name && <div className="text-sm font-medium text-primary">{newM.name}</div>}
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="Wert" value={newM.value}
                onChange={e => setNewM(p => ({...p, value: e.target.value}))}
                className="bg-secondary border-border" />
              <Input placeholder="Einheit (z.B. mg/dL)" value={newM.unit}
                onChange={e => setNewM(p => ({...p, unit: e.target.value}))}
                className="bg-secondary border-border" />
            </div>
            <div className="flex gap-2">
              {(['good','warn','bad'] as const).map(s => (
                <button key={s} onClick={() => setNewM(p => ({...p, status: s}))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    newM.status === s ? STATUS_COLORS[s].bg + ' ' + STATUS_COLORS[s].text + ' ' + STATUS_COLORS[s].border
                    : 'border-border text-muted-foreground'}`}>
                  {s === 'good' ? '✓ Optimal' : s === 'warn' ? '⚠ Warn' : '✗ Kritisch'}
                </button>
              ))}
            </div>
            <Button onClick={addMarker} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Eintragen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Marker list */}
      {markers.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          Noch keine Biomarker — tippe auf + Wert eintragen
        </div>
      ) : (
        <div className="space-y-2">
          {markers.map((m) => {
            const c = STATUS_COLORS[m.status]
            return (
              <Card key={m.id} className={`${c.bg} ${c.border} border`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xl font-bold ${c.text}`}>{m.value}</p>
                        <p className="text-xs text-muted-foreground">{m.unit}</p>
                      </div>
                      <button onClick={() => save(markers.filter(x => x.id !== m.id))}
                        className="text-muted-foreground hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <Badge className={`text-xs border-0 mt-2 ${c.badge}`}>
                    {m.status === 'good' ? '✓ Optimal' : m.status === 'warn' ? '⚠ Optimierbar' : '✗ Prüfen'}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
