export default function CustomerCard({ customer }) {
  if (!customer) return null

  const fields = [
    { label: 'שם עסק',  value: customer.business_name },
    { label: 'טלפון',   value: customer.phone },
    { label: 'אימייל',  value: customer.email },
    { label: 'כתובת',   value: customer.address },
    { label: 'קטגוריה', value: customer.category },
  ]

  return (
    <div
      className="customer-card-animate mx-1 mb-2 rounded-2xl overflow-hidden"
      style={{
        border: '1px solid rgba(255,102,0,0.18)',
        boxShadow: '0 4px 24px rgba(15,28,46,0.10)',
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f1c2e 0%, #1a2d47 100%)',
          padding: '12px 16px',
        }}
      >
        <div style={{ color: '#ff6600', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', marginBottom: 3 }}>
          פרטי העסק שנשמרו ✓
        </div>
        <div style={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
          {customer.business_name}
        </div>
      </div>

      {/* Fields grid */}
      <div
        style={{
          background: 'white',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px 20px',
        }}
      >
        {fields.map(({ label, value }) => (
          <div key={label}>
            <div style={{ color: '#8898aa', fontSize: '0.7rem', fontWeight: 600, marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ color: '#0f1c2e', fontSize: '0.86rem', fontWeight: 500 }}>
              {value || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Services */}
      <div
        style={{
          background: '#f8f9fb',
          padding: '10px 16px 12px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ color: '#8898aa', fontSize: '0.7rem', fontWeight: 600, marginBottom: 6 }}>
          שירותים
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {(customer.services || []).map((s, i) => (
            <span key={i} className="service-chip">{s}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
