'use client'

import { useState } from 'react'

interface OrderModalProps {
  depotId:       number
  kelasList:     string[]
  initialKelas?: string
  initialJenis?: string
  onClose:       () => void
  onSuccess:     () => void
}

const JENIS_OPTIONS = ['SAPI', 'DOMBA']
const TIPE_OPTIONS  = ['SHQ', 'THQ', 'PHQ']
const API_URL       = process.env.NEXT_PUBLIC_API_URL ?? ''

export function OrderModal({ depotId, kelasList, onClose, onSuccess, initialKelas = '', initialJenis = 'SAPI' }: OrderModalProps) {
  const [form, setForm] = useState({
    nama:        '',
    hp:          '',
    alamat:      '',
    jenis:       initialJenis,
    kelas:       initialKelas || kelasList[0] || '',
    tipe_qurban: 'SHQ',
    catatan:     '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nama || !form.hp) { setError('Nama dan no. HP wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/katalog/order`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ depot_id: depotId, ...form }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data?.message ?? 'Gagal mengirim order.')
        return
      }
      onSuccess()
    } catch {
      setError('Gagal mengirim order. Cek koneksi internet.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Form Pemesanan</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={labelClass}>Nama Lengkap *</label>
            <input className={inputClass} value={form.nama} onChange={(e) => set('nama', e.target.value)} placeholder="Ahmad Fauzi" required />
          </div>
          <div>
            <label className={labelClass}>No. HP / WhatsApp *</label>
            <input className={inputClass} value={form.hp} onChange={(e) => set('hp', e.target.value)} placeholder="08123456789" required />
          </div>
          <div>
            <label className={labelClass}>Alamat</label>
            <textarea className={`${inputClass} h-20 resize-none`} value={form.alamat} onChange={(e) => set('alamat', e.target.value)} placeholder="Alamat lengkap (opsional)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jenis</label>
              <select className={inputClass} value={form.jenis} onChange={(e) => set('jenis', e.target.value)}>
                {JENIS_OPTIONS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Kelas</label>
              <select className={inputClass} value={form.kelas} onChange={(e) => set('kelas', e.target.value)}>
                {kelasList.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tipe Qurban</label>
            <div className="flex gap-2">
              {TIPE_OPTIONS.map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => set('tipe_qurban', t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.tipe_qurban === t
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >{t}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan (opsional)</label>
            <textarea className={`${inputClass} h-16 resize-none`} value={form.catatan} onChange={(e) => set('catatan', e.target.value)} placeholder="Mis. minta ukuran tertentu, jadwal terima, dll." />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl transition-colors"
          >
            {saving ? 'Mengirim...' : 'Kirim Pesanan'}
          </button>
        </form>
      </div>
    </div>
  )
}
