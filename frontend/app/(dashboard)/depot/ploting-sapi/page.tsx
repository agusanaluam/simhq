'use client'

import { useCallback, useEffect, useState } from 'react'
import { SlotGrid } from './SlotGrid'
import { SlotPanel } from './SlotPanel'
import { AssignSlotModal } from './AssignSlotModal'
import api from '@/lib/api'

interface SapiData {
  id: number
  no_hewan: string
  status: string
  bobot_masuk: string
  kelas_jual?: { kode: string } | null
  slot_terisi: number
  slot_total: number
}

interface SlotEntry {
  no_slot: number
  status?: 'KOSONG'
  nama_qurban?: string
  tipe_qurban?: string
  status_bayar?: string
  harga_slot?: number
  customer?: { nama: string; hp: string } | null
}

export default function PlotingSapiPage() {
  const [sapiList, setSapiList]     = useState<SapiData[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedSapi, setSelected] = useState<SapiData | null>(null)
  const [slots, setSlots]           = useState<SlotEntry[]>([])
  const [assignSlot, setAssignSlot] = useState<number | null>(null)

  const loadSapi = useCallback(() => {
    setLoading(true)
    api.get('/api/hewan/sapi/ploting')
      .then(r => setSapiList(r.data.data ?? []))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadSapi() }, [loadSapi])

  async function selectSapi(sapi: SapiData) {
    setSelected(sapi)
    const r = await api.get(`/api/hewan/${sapi.id}/slot`)
    setSlots(r.data.slots ?? [])
  }

  async function handleDelete(noSlot: number) {
    if (!selectedSapi) return
    if (!confirm(`Hapus slot ${noSlot}?`)) return
    await api.delete(`/api/hewan/${selectedSapi.id}/slot/${noSlot}`)
    const [slotRes] = await Promise.all([
      api.get(`/api/hewan/${selectedSapi.id}/slot`),
      loadSapi(),
    ])
    setSlots(slotRes.data.slots ?? [])
  }

  function handleAssignDone() {
    setAssignSlot(null)
    if (selectedSapi) selectSapi(selectedSapi)
    loadSapi()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Ploting Slot Sapi</h1>
          <p className="text-sm text-on-surface-variant mt-1">1 sapi = 7 slot pembeli</p>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {loading ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Memuat...</p>
          ) : sapiList.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-8 text-center">Belum ada sapi di depot ini</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {sapiList.map(sapi => (
                <button
                  key={sapi.id}
                  onClick={() => selectSapi(sapi)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    selectedSapi?.id === sapi.id
                      ? 'border-primary bg-surface-high shadow-card'
                      : 'border-surface-high hover:border-primary/50 bg-surface-lowest'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display font-bold text-sm text-on-surface">#{sapi.no_hewan}</span>
                    {sapi.slot_terisi === 7 && (
                      <span className="text-xs font-body font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                        PENUH
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant font-body mb-2">
                    {sapi.kelas_jual?.kode ?? '—'} · {sapi.bobot_masuk} kg
                  </p>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 7 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-sm ${i < sapi.slot_terisi ? 'bg-primary' : 'bg-surface-high'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-on-surface-variant font-body">
                    {sapi.slot_terisi}/{sapi.slot_total} slot
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedSapi && (
          <SlotPanel
            sapi={selectedSapi}
            slots={slots}
            onAssign={noSlot => setAssignSlot(noSlot)}
            onDelete={handleDelete}
            onClose={() => { setSelected(null); setSlots([]) }}
          />
        )}
      </div>

      {assignSlot !== null && selectedSapi && (
        <AssignSlotModal
          hewanId={selectedSapi.id}
          noSlot={assignSlot}
          hargaDefault={0}
          onDone={handleAssignDone}
          onClose={() => setAssignSlot(null)}
        />
      )}
    </div>
  )
}
