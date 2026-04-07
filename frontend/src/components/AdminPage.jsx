import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || ''

const COLUMNS = [
  { key: 'id',            label: '#' },
  { key: 'business_name', label: 'שם עסק' },
  { key: 'phone',         label: 'טלפון' },
  { key: 'email',         label: 'אימייל' },
  { key: 'address',       label: 'כתובת' },
  { key: 'category',      label: 'קטגוריה' },
  { key: 'services',      label: 'שירותים' },
  { key: 'created_at',    label: 'תאריך הצטרפות' },
  { key: '_actions',      label: 'פעולות' },
]

export default function AdminPage() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Allow full-width layout — restore on unmount
  useEffect(() => {
    const root = document.getElementById('root')
    const prev = root.style.maxWidth
    root.style.maxWidth = '100%'
    return () => { root.style.maxWidth = prev }
  }, [])

  useEffect(() => {
    fetch(`${API_BASE}/admin/customers`)
      .then(r => { if (!r.ok) throw new Error(`שגיאת שרת: ${r.status}`); return r.json() })
      .then(d => setCustomers(d.customers))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(id, businessName) {
    if (!window.confirm(`למחוק את "${businessName}"?`)) return
    try {
      const res = await fetch(`${API_BASE}/admin/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(res.status)
      setCustomers(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      alert(`שגיאה במחיקה: ${e.message}`)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f0f2f5', direction: 'rtl', fontFamily: 'Heebo, Arial Hebrew, Arial, sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #0f1c2e 0%, #162338 60%, #1a2d47 100%)',
          padding: '16px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            width: 40, height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #ff6600 0%, #cc4400 100%)',
            boxShadow: '0 2px 12px rgba(255,102,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 900, fontSize: 18, letterSpacing: '0.06em',
          }}
        >
          Z
        </div>
        <div>
          <div style={{ color: 'white', fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.06em' }}>ZAP</div>
          <div style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 500 }}>ניהול לקוחות</div>
        </div>
        {!loading && !error && (
          <div
            style={{
              marginRight: 'auto',
              background: 'rgba(255,102,0,0.15)',
              color: '#ff8533',
              border: '1px solid rgba(255,102,0,0.3)',
              borderRadius: 20,
              padding: '4px 14px',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            {customers.length} עסקים
          </div>
        )}
      </header>

      {/* Content */}
      <main style={{ padding: '24px 20px' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60, fontSize: '1rem' }}>
            טוען נתונים...
          </div>
        )}
        {error && (
          <div style={{ textAlign: 'center', color: '#dc2626', padding: 60, fontSize: '0.95rem' }}>
            שגיאה: {error}
          </div>
        )}
        {!loading && !error && customers.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: 60, fontSize: '0.95rem' }}>
            אין לקוחות עדיין.
          </div>
        )}
        {!loading && !error && customers.length > 0 && (
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(15,28,46,0.10)', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: '#0f1c2e' }}>
                    {COLUMNS.map(col => (
                      <th
                        key={col.key}
                        style={{
                          padding: '13px 16px',
                          textAlign: 'right',
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          letterSpacing: '0.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((row, i) => (
                    <tr
                      key={row.id}
                      style={{
                        background: i % 2 === 0 ? 'white' : '#f7f9fc',
                        borderBottom: '1px solid #edf0f5',
                        transition: 'background 0.15s',
                      }}
                    >
                      {COLUMNS.map(col => (
                        <td key={col.key} style={{ padding: '11px 16px', verticalAlign: 'middle', color: '#0f1c2e' }}>
                          {col.key === '_actions' ? (
                            <button
                              onClick={() => handleDelete(row.id, row.business_name)}
                              style={{
                                background: 'rgba(220,38,38,0.08)',
                                color: '#dc2626',
                                border: '1px solid rgba(220,38,38,0.2)',
                                borderRadius: 8,
                                padding: '4px 12px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              מחק
                            </button>
                          ) : col.key === 'services' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                              {(row.services || []).map((s, j) => (
                                <span key={j} className="service-chip">{s}</span>
                              ))}
                            </div>
                          ) : col.key === 'created_at' ? (
                            new Date(row.created_at).toLocaleDateString('he-IL')
                          ) : (
                            row[col.key] ?? '—'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
