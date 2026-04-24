'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import api from '@/lib/api'

interface WaLogRow {
  id:            number
  penerima:      string
  pesan:         string
  status:        string
  triggered_by:  string
  created_at:    string
  error_message: string | null
}

const STATUS_BADGE: Record<string, string> = {
  QUEUED: 'bg-yellow-100 text-yellow-700',
  SENT:   'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
}

export default function WaLogPage() {
  const [logs,    setLogs]    = useState<WaLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/admin/wa-log')
      setLogs(res.data.data?.data ?? [])
    } catch {
      setError('Gagal memuat log WA.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl text-on-surface">Log WhatsApp</h1>
          <p className="text-sm text-on-surface-variant mt-1">Riwayat pesan WA terkirim via WAHA</p>
        </div>
        <button onClick={fetchData} className="text-sm text-primary hover:underline">Refresh</button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-[#fee2e2] border border-[#fca5a5] rounded-lg">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      <Card>
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-surface rounded animate-pulse" />)}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center py-8 text-on-surface-variant text-sm">Belum ada log pesan WA.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-high">
                  {['Waktu', 'Penerima', 'Pesan', 'Trigger', 'Status'].map((h) => (
                    <th key={h} className="text-left py-3 px-4 font-body font-medium text-on-surface-variant text-xs uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-high last:border-0 hover:bg-surface-low transition-colors">
                    <td className="py-3 px-4 font-body text-on-surface-variant text-xs whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-body text-on-surface">{log.penerima}</td>
                    <td className="py-3 px-4 font-body text-on-surface-variant max-w-xs truncate" title={log.pesan}>
                      {log.pesan}
                    </td>
                    <td className="py-3 px-4 font-body text-on-surface-variant text-xs">{log.triggered_by}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_BADGE[log.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {log.status}
                      </span>
                      {log.status === 'FAILED' && log.error_message && (
                        <p className="text-xs text-error mt-0.5 max-w-xs truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
