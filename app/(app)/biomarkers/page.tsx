'use client'
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, TrendingUp, TrendingDown, Minus, Plus, ChevronRight } from 'lucide-react'
import { mockBiomarkers } from '@/lib/mock-data'

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

export default function BiomarkersPage() {
  const [markers, setMarkers] = useState(mockBiomarkers)
  const [adding, setAdding] = useState(false)
  const [newM, setNewM] = useState({ name: '', value: '', unit: '' })
  const [search, setSearch] = useState('')

  const addMarker = () => {
    if (!newM.name || !newM.value) return
    const val = parseFloat(newM.value)
    setMarkers(p => [...p, { name: newM.name, value: val, unit: newM.unit, optimal: '–', status: 'good' }])
    setNewM({ name: '', value: '', unit: '' })
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
            <Input placeholder="Suche Marker..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-secondary border-border" />
            {search && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filtered.map(m => (
                  <button key={m} onClick={() => { setNewM(p => ({...p, name: m})); setSearch('') }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-secondary transition-colors">
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
            <Button onClick={addMarker} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Eintragen
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Marker list */}
      <div className="space-y-2">
        {markers.map((m, i) => {
          const c = STATUS_COLORS[m.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.good
          return (
            <Card key={i} className={`${c.bg} ${c.border} border`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Optimal: {m.optimal}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${c.text}`}>{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.unit}</p>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <Badge className={`text-xs border-0 ${c.badge}`}>
                    {m.status === 'good' ? '✓ Optimal' : m.status === 'warn' ? '⚠ Optimierbar' : '✗ Prüfen'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
