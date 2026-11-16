import { useState, useEffect } from 'react'
import { fetchHistory } from '../api'
import { Link } from 'react-router-dom'

const RISK_CLASS = {
  Low:      'risk-low',
  Moderate: 'risk-moderate',
  Higher:   'risk-higher',
  High:     'risk-high',
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function ExpandRow({ record }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>
        <td style={{ color: 'rgba(226,234,248,0.4)', fontFamily: 'monospace' }}>#{record.id}</td>
        <td style={{ textTransform: 'capitalize', fontWeight: 500 }}>{record.disease_module.replace('_', ' ')}</td>
        <td>
          <span className={`risk-badge ${RISK_CLASS[record.risk_level] || ''}`}>
            ● {record.risk_level}
          </span>
        </td>
        <td style={{ fontWeight: 600 }}>
          {record.probability != null ? `${Math.round(record.probability * 100)}%` : '—'}
        </td>
        <td style={{ color: 'rgba(226,234,248,0.5)', fontSize: '0.82rem' }}>{fmtDate(record.created_at)}</td>
        <td style={{ color: 'rgba(226,234,248,0.4)', fontSize: '0.85rem' }}>{open ? '▲' : '▼'}</td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} style={{ padding: '0 16px 16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.35)', marginBottom: 8 }}>Symptoms</div>
                {record.symptoms?.length
                  ? record.symptoms.map(s => (
                    <span key={s} style={{ display: 'inline-block', margin: '2px 4px 2px 0', padding: '2px 10px', background: 'rgba(79,158,255,0.1)', borderRadius: 99, fontSize: '0.78rem', color: '#4f9eff' }}>
                      {s.replace(/_/g, ' ')}
                    </span>
                  ))
                  : <span style={{ color: 'rgba(226,234,248,0.3)', fontSize: '0.8rem' }}>None reported</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.35)', marginBottom: 8 }}>Contributing Factors</div>
                {record.contributing_factors?.length
                  ? record.contributing_factors.map((f, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: 'rgba(226,234,248,0.7)', padding: '2px 0' }}>• {f}</div>
                  ))
                  : <span style={{ color: 'rgba(226,234,248,0.3)', fontSize: '0.8rem' }}>—</span>
                }
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.35)', marginBottom: 8 }}>Clinical Params</div>
                {record.clinical_parameters
                  ? Object.entries(record.clinical_parameters)
                      .filter(([, v]) => v !== null && v !== undefined)
                      .map(([k, v]) => (
                        <div key={k} style={{ fontSize: '0.82rem', color: 'rgba(226,234,248,0.6)', padding: '1px 0' }}>
                          <span style={{ color: 'rgba(226,234,248,0.4)' }}>{k.replace(/_/g, ' ')}: </span>
                          <span style={{ fontWeight: 600 }}>{v}</span>
                        </div>
                      ))
                  : <span style={{ color: 'rgba(226,234,248,0.3)', fontSize: '0.8rem' }}>—</span>
                }
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function History() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [page, setPage]       = useState(0)
  const limit = 20

  const load = (p) => {
    setLoading(true)
    fetchHistory({ limit, offset: p * limit })
      .then(data => { setRecords(data); setPage(p) })
      .catch(() => setError('Could not load history.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(0) }, [])

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📋 <span className="gradient-text">Assessment History</span></h1>
        <p>All AI-assisted preliminary assessments stored in the database. Click a row to expand details.</p>
      </div>

      {error && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span className="alert-icon">⚠️</span><span>{error}</span>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <h3>Stored Assessments</h3>
          <Link to="/assessment" className="btn btn-primary btn-sm">+ New Assessment</Link>
        </div>

        {loading ? (
          <div className="loading-center">
            <div className="spinner" /><span style={{ color: 'rgba(226,234,248,0.5)' }}>Loading…</span>
          </div>
        ) : records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'rgba(226,234,248,0.3)' }}>
            No assessments recorded yet.<br /><br />
            <Link to="/assessment" className="btn btn-primary">Start First Assessment →</Link>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Module</th>
                    <th>Risk Level</th>
                    <th>Probability</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => <ExpandRow key={r.id} record={r} />)}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={() => load(page - 1)} disabled={page === 0}>← Prev</button>
              <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: 'rgba(226,234,248,0.5)' }}>Page {page + 1}</span>
              <button className="btn btn-outline btn-sm" onClick={() => load(page + 1)} disabled={records.length < limit}>Next →</button>
            </div>
          </>
        )}
      </div>

      <div className="disclaimer-banner" style={{ marginTop: 24 }}>
        <strong>⚠️ Note:</strong> All records represent AI-assisted preliminary assessments only.
        They do not constitute medical diagnoses. No personally identifying information is stored.
      </div>
    </div>
  )
}
