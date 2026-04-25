'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card } from '@/components/ui/Card'
import { StepJenisKelas } from './StepJenisKelas'
import { StepPilihHewan } from './StepPilihHewan'
import { StepDataPembeli } from './StepDataPembeli'
import { StepReview } from './StepReview'
import api from '@/lib/api'

const MUSIM = new Date().getFullYear()
const STEP_LABELS = ['Jenis & Kelas', 'Pilih Hewan', 'Data Pembeli', 'Review & Submit']

interface FormState {
  jenis: string
  kelasId: number | null
  tipeQurban: string
  harga: number
  kelasKode: string
  hewanId: number | null
  hewanNo: string | null
  preorder: boolean
  customerId: number | null
  namaPembeli: string
  hp: string
  alamat: string
  kelurahan: string
  kecamatan: string
  kode_pos: string
  kota: string
}

const INIT: FormState = {
  jenis: 'SAPI', kelasId: null, tipeQurban: 'SHQ', harga: 0, kelasKode: '',
  hewanId: null, hewanNo: null, preorder: false,
  customerId: null, namaPembeli: '', hp: '', alamat: '',
  kelurahan: '', kecamatan: '', kode_pos: '', kota: '',
}

export default function POSPage() {
  const router              = useRouter()
  const { data: session }   = useSession()
  const [step, setStep]     = useState(0)
  const [form, setForm]     = useState<FormState>(INIT)
  const [submitting, setSubmitting] = useState(false)

  const depotId = (session?.user as any)?.depot_id as number | undefined

  function onStep1Done(data: { jenis: string; kelasId: number; tipeQurban: string; harga: number; kelasKode: string }) {
    setForm(f => ({ ...f, ...data }))
    setStep(1)
  }

  function onStep2Done(data: { hewanId: number | null; preorder: boolean; hewanNo: string | null }) {
    setForm(f => ({ ...f, ...data }))
    setStep(2)
  }

  function onStep3Done(data: { customerId: number; nama: string; hp: string; alamat: string; kelurahan: string; kecamatan: string; kode_pos: string; kota: string }) {
    setForm(f => ({
      ...f,
      customerId:  data.customerId,
      namaPembeli: data.nama,
      hp:          data.hp,
      alamat:      data.alamat,
      kelurahan:   data.kelurahan,
      kecamatan:   data.kecamatan,
      kode_pos:    data.kode_pos,
      kota:        data.kota,
    }))
    setStep(3)
  }

  async function onStep4Done(data: {
    csId: number | null
    tellerId: number | null
    salesNama: string
    rencana_pelunasan: string
    metodeBayar: string
    tipeBayar: string
    nominalBayar: number
  }) {
    if (!depotId || !form.kelasId || !form.customerId) return
    setSubmitting(true)
    try {
      const res = await api.post('/api/transaksi', {
        depot_id:           depotId,
        hewan_id:           form.hewanId,
        customer_id:        form.customerId,
        cs_id:              data.csId,
        teller_id:          data.tellerId,
        sales_id:           null,
        sales_nama:         data.salesNama || null,
        rencana_pelunasan:  data.rencana_pelunasan || null,
        tipe_qurban:        form.tipeQurban,
        jenis:              form.jenis,
        kelas_id:           form.kelasId,
        musim:              MUSIM,
      })
      const transaksiId = res.data.transaksi.id

      await api.post(`/api/transaksi/${transaksiId}/bayar`, {
        jumlah:    data.nominalBayar,
        tipe:      data.tipeBayar,
        metode:    data.metodeBayar,
        teller_id: data.tellerId,
        tgl_bayar: new Date().toISOString().split('T')[0],
      })

      router.push('/depot/transaksi')
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-2xl text-on-surface">POS Penjualan</h1>
        <p className="text-sm text-on-surface-variant mt-1">Transaksi baru</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-body font-semibold transition-colors ${
              i < step
                ? 'bg-primary text-white'
                : i === step
                  ? 'bg-primary text-white ring-2 ring-primary/30'
                  : 'bg-surface-high text-on-surface-variant'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-body hidden sm:inline mr-2 ${
              i === step ? 'text-on-surface font-medium' : 'text-on-surface-variant'
            }`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && <div className="w-4 h-px bg-surface-high" />}
          </div>
        ))}
      </div>

      <Card>
        <h2 className="font-display font-semibold text-on-surface mb-4">{STEP_LABELS[step]}</h2>

        {step === 0 && (
          <StepJenisKelas
            jenis={form.jenis}
            kelasId={form.kelasId}
            tipeQurban={form.tipeQurban}
            musim={MUSIM}
            onNext={onStep1Done}
          />
        )}
        {step === 1 && (
          <StepPilihHewan
            jenis={form.jenis}
            kelasId={form.kelasId}
            hewanId={form.hewanId}
            preorder={form.preorder}
            onNext={onStep2Done}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <StepDataPembeli
            data={{
              customerId: form.customerId,
              nama:       form.namaPembeli,
              hp:         form.hp,
              alamat:     form.alamat,
              kelurahan:  form.kelurahan,
              kecamatan:  form.kecamatan,
              kode_pos:   form.kode_pos,
              kota:       form.kota,
            }}
            onNext={onStep3Done}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepReview
            summary={{
              jenis: form.jenis,
              tipeQurban: form.tipeQurban,
              kelasKode: form.kelasKode,
              harga: form.harga,
              hewanNo: form.hewanNo,
              preorder: form.preorder,
              namaPembeli: form.namaPembeli,
              hp: form.hp,
            }}
            onSubmit={onStep4Done}
            onBack={() => setStep(2)}
            submitting={submitting}
          />
        )}
      </Card>
    </div>
  )
}
