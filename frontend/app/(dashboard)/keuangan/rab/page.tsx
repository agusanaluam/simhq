'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { RabSummaryTable, type RabRow } from './components/RabSummaryTable'
import { SetRabModal }          from './components/SetRabModal'
import { TambahRealisasiModal } from './components/TambahRealisasiModal'
import api from '@/lib/api'

function TambahKategoriModal({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [nama, setNama]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function submit() {
    if (!nama.trim()) { setError('Nama kategori wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      await api.post('/api/master/rab-kategori', { nama: nama.trim() })
      onDone()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })
        ?.response?.data?.message
      setError(msg ?? 'Gagal menyimpan.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6 space-y-4">
        <h2 className="font-display font-semibold text-lg text-on-surface">Tambah Kategori RAB</h2>
        <Input
          label="Nama Kategori"
          value={nama}
          onChange={e => setNama(e.target.value)}
          placeholder="Pakan Sapi, Gaji Karyawan, dll..."
        />
        {error && <p className="text-sm text-error bg-[#fee2e2] px-3 py-2 rounded-md">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Batal</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Simpan</Button>
        </div>
      </div>
    </div>
  )
}

export default function RabPage() {
  const currentYear = new Date().getFullYear()

  const [rows,    setRows]    = useState<RabRow[]>([])
  const [musim,   setMusim]   = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [editRabRow,     setEditRabRow]     = useState<RabRow | null>(null)
  const [tambahRab,      setTambahRab]      = useState(false)
  const [realisasiRow,   setRealisasiRow]   = useState<RabRow | null>(null)
  const [tambahKategori, setTambahKategori] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/api/keuangan/rab/summary?musim=${musim}`)
      setRows(res.data.data ?? [])
    } catch {
      setError('Gagal memuat data RAB.')
    } finally {
      setLoading(false)
    }
  }, [musim])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">RAB & Realisasi</h1>
          <p className="text-sm text-on-surface-variant mt-1">Anggaran per kategori vs realisasi pengeluaran</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-on-surface-variant uppercase tracking-widest font-body">Musim</label>
          <input
            type="number"
            min="2020"
            max="2099"
            value={musim}
            onChange={(e) => setMusim(Number(e.target.value))}
            className="input-field text-sm w-24"
          />
          <Button variant="secondary" onClick={() => setTambahKategori(true)}>+ Kategori</Button>
          <Button onClick={() => setTambahRab(true)}>+ Pos RAB</Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!loading && (
        <RabSummaryTable
          rows={rows}
          onSetRab={(row) => setEditRabRow(row)}
          onAddRealisasi={(row) => setRealisasiRow(row)}
        />
      )}

      {tambahKategori && (
        <TambahKategoriModal
          onDone={() => setTambahKategori(false)}
          onClose={() => setTambahKategori(false)}
        />
      )}

      {tambahRab && (
        <SetRabModal
          kategoriId={null}
          kategoriNama=""
          musim={musim}
          currentAnggaran={0}
          onDone={() => { setTambahRab(false); fetchData() }}
          onClose={() => setTambahRab(false)}
        />
      )}

      {editRabRow && (
        <SetRabModal
          kategoriId={editRabRow.kategori_id}
          kategoriNama={editRabRow.kategori}
          musim={musim}
          currentAnggaran={editRabRow.jumlah_anggaran}
          onDone={() => { setEditRabRow(null); fetchData() }}
          onClose={() => setEditRabRow(null)}
        />
      )}

      {realisasiRow && (
        <TambahRealisasiModal
          rabId={realisasiRow.rab_id}
          divisi={realisasiRow.kategori}
          onDone={() => { setRealisasiRow(null); fetchData() }}
          onClose={() => setRealisasiRow(null)}
        />
      )}
    </div>
  )
}
