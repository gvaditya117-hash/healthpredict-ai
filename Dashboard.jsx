import { useState, useEffect, useRef } from 'react'
import { fetchDashboard } from '../api'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

/* ─────────────────────── Constants ─────────────────────── */
const RISK_COLORS = {
  Low:      '#10d98c',
  Moderate: '#f5a623',
  Higher:   '#ff7b3a',
  High:     '#ff3a5c',
}

const RISK_ICON = { Low: '🟢', Moderate: '🟡', Higher: '🟠', High: '🔴' }
const RISK_CLASS = { Low: 'risk-low', Moderate: 'risk-moderate', Higher: 'risk-higher', High: 'risk-high' }

const DISEASE_MODULES = [
  {
    id: 'diabetes',
    name: 'Diabetes Risk',
    icon: '🩸',
    accent: '#4f9eff',
    rgb: '79, 158, 255',
    desc: 'Analyzes glucose, BMI, insulin & metabolic symptoms to estimate Type 2 Diabetes risk.',
    keyMetrics: 'Glucose · BMI · Insulin',
  },
  {
    id: 'heart_disease',
    name: 'Heart Disease',
    icon: '❤️',
    accent: '#ff5a87',
    rgb: '255, 90, 135',
    desc: 'Evaluates cardiovascular risk via blood pressure, cholesterol, max heart rate & ECG indicators.',
    keyMetrics: 'BP · Cholesterol · ECG ST',
  },
  {
    id: 'liver_disease',
    name: 'Liver Disease',
    icon: '🫀',
    accent: '#f5a623',
    rgb: '245, 166, 35',
    desc: 'Assesses hepatic health using total/direct bilirubin, ALP, ALT, AST enzymes & albumin ratio.',
    keyMetrics: 'Bilirubin · ALT/AST · ALP',
  },
  {
    id: 'kidney_disease',
    name: 'Kidney Disease',
    icon: '🫘',
    accent: '#10d98c',
    rgb: '16, 217, 140',
    desc: 'Screens for chronic renal risk using serum creatinine, blood urea, and urine albumin.',
    keyMetrics: 'Creatinine · BUN · Proteinuria',
  },
]

/* ─────────────────────── Helper Utilities ─────────────────────── */
function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function pct(val, total) {
  return total ? Math.round((val / total) * 100) : 0
}

function getGreeting() {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 17) return 'Good afternoon'
  return 'Good evening'
}

/* ─────────────────────── Risk Gauge Component ─────────────────────── */
function RiskGauge({ score = 0, label = 'Higher-risk category share' }) {
  const R = 80, cx = 100, cy = 100
  const startAngle = 210
  const endAngle = -30
  const totalAngle = startAngle - endAngle
  const filledAngle = (score / 100) * totalAngle

  const toXY = (deg, r) => {
    const rad = (deg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
  }

  const describeArc = (start, end, r) => {
    const s = toXY(start, r)
    const e = toXY(end, r)
    const large = (start - end) > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`
  }

  const needleDeg = startAngle - filledAngle
  const needleEnd = toXY(needleDeg, 60)

  const color =
    score < 25 ? '#10d98c' :
    score < 50 ? '#f5a623' :
    score < 75 ? '#ff7b3a' : '#ff3a5c'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg viewBox="0 0 200 130" style={{ width: 220, overflow: 'visible' }}>
        <defs>
          <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track (gray arc) */}
        <path
          d={describeArc(startAngle, endAngle, R)}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={14}
          strokeLinecap="round"
        />

        {/* Colored fill arc */}
        <path
          d={describeArc(startAngle, needleDeg, R)}
          fill="none" stroke={color} strokeWidth={14}
          strokeLinecap="round"
          filter="url(#gaugeGlow)"
          style={{ transition: 'all 1.2s cubic-bezier(.4,0,.2,1)' }}
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(t => {
          const deg = startAngle - (t / 100) * totalAngle
          const inner = toXY(deg, R - 10)
          const outer = toXY(deg, R + 2)
          return (
            <line
              key={t}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1.5}
            />
          )
        })}

        {/* Needle */}
        <line
          x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y}
          stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round"
          filter="url(#gaugeGlow)"
          style={{ transition: 'all 1.2s cubic-bezier(.4,0,.2,1)' }}
        />
        <circle cx={cx} cy={cy} r={6} fill={color} filter="url(#gaugeGlow)" />

        {/* Score text */}
        <text
          x={cx} y={cy - 12} textAnchor="middle" fontSize={28} fontWeight={800}
          fill="#fff" fontFamily="Outfit,sans-serif"
        >
          {score}%
        </text>
        <text
          x={cx} y={cy + 8} textAnchor="middle" fontSize={10} fill={color} fontWeight={700} letterSpacing={1}
        >
          HIGH RISK SHARE
        </text>

        {/* Scale labels */}
        {['0', '25', '50', '75', '100'].map(t => {
          const deg = startAngle - (parseInt(t) / 100) * totalAngle
          const pos = toXY(deg, R + 16)
          return (
            <text
              key={t} x={pos.x} y={pos.y} textAnchor="middle"
              fontSize={8.5} fill="rgba(226,234,248,0.35)" fontFamily="Inter,sans-serif"
            >
              {t}
            </text>
          )
        })}
      </svg>
      <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.4)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

/* ─────────────────────── Animated Counter ─────────────────────── */
function AnimCounter({ target, suffix = '', prefix = '' }) {
  const [val, setVal] = useState(0)
  const raf = useRef()
  useEffect(() => {
    let start = 0, duration = 800, startTime = null
    const animate = (ts) => {
      if (!startTime) startTime = ts
      const progress = Math.min((ts - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.floor(ease * target))
      if (progress < 1) raf.current = requestAnimationFrame(animate)
      else setVal(target)
    }
    raf.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return <span>{prefix}{val}{suffix}</span>
}

/* ─────────────────────── KPI Card ─────────────────────── */
function KpiCard({ label, value, icon, accent, subtext }) {
  return (
    <div className="kpi-card" style={{ '--kpi-accent': accent }}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">
        <AnimCounter target={value} />
      </div>
      <div className="kpi-trend">
        <span>{subtext}</span>
      </div>
    </div>
  )
}

/* ─────────────────────── Custom Chart Tooltip ─────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(13,21,40,0.97)',
      border: '1px solid rgba(79,158,255,0.25)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontSize: '0.72rem', color: 'rgba(226,234,248,0.5)', marginBottom: 4 }}>
        {label}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ fontSize: '0.88rem', fontWeight: 700, color: p.color || '#4f9eff' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────── Recent Activity Item with Expandable Details ─────────────────────── */
function ActivityItem({ record, index }) {
  const [expanded, setExpanded] = useState(false)
  const riskCol = RISK_COLORS[record.risk_level] || '#4f9eff'
  const params = record.clinical_parameters || {}

  return (
    <div className="activity-item" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="activity-dot" style={{ background: riskCol, boxShadow: `0 0 8px ${riskCol}88` }} />
      <div className="activity-body">
        <div className="activity-title">
          <span style={{ textTransform: 'capitalize', fontWeight: 700, color: '#fff' }}>
            {record.disease_module.replace('_', ' ')} Assessment
          </span>
          <span className={`risk-badge ${RISK_CLASS[record.risk_level] || ''}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
            {RISK_ICON[record.risk_level]} {record.risk_level} Risk
          </span>
        </div>

        <div className="activity-meta">
          <span>
            Model Confidence: <strong style={{ color: riskCol }}>
              {record.probability != null ? `${Math.round(record.probability * 100)}%` : '—'}
            </strong>
          </span>
          <span style={{ color: 'rgba(226,234,248,0.4)', fontSize: '0.75rem' }}>
            {timeAgo(record.created_at)}
          </span>
        </div>

        {record.contributing_factors?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6, marginBottom: 8 }}>
            {record.contributing_factors.slice(0, 3).map((f, j) => (
              <span key={j} className="factor-tag">{f}</span>
            ))}
            {record.contributing_factors.length > 3 && (
              <span className="factor-tag" style={{ color: 'rgba(226,234,248,0.4)' }}>
                +{record.contributing_factors.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Inline expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(79,158,255,0.85)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {expanded ? '▲ Hide clinical inputs' : '▼ Inspect clinical inputs'}
        </button>

        {expanded && (
          <div style={{
            marginTop: 10,
            padding: 10,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.78rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 6,
          }}>
            {Object.entries(params)
              .filter(([, v]) => v !== null && v !== undefined)
              .map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: 'rgba(226,234,248,0.4)' }}>{k.replace(/_/g, ' ')}: </span>
                  <strong style={{ color: '#fff' }}>{String(v)}</strong>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────── Custom Donut Pie Label ─────────────────────── */
const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.08) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  )
}

/* ─────────────────────── Main Dashboard Page ─────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [now, setNow] = useState(new Date())
  const [activityFilter, setActivityFilter] = useState('all')

  const loadData = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    fetchDashboard()
      .then(data => {
        setStats(data)
        setError(null)
      })
      .catch(() => setError('Could not connect to backend server. Ensure API is running.'))
      .finally(() => {
        setLoading(false)
        if (isRefresh) setRefreshing(false)
      })
  }

  useEffect(() => {
    loadData()
    const clockTimer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(clockTimer)
  }, [])

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center" style={{ paddingTop: 100 }}>
          <div className="spinner" />
          <span style={{ color: 'rgba(226,234,248,0.5)', fontSize: '0.9rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Loading Clinical Analytics…
          </span>
        </div>
      </div>
    )
  }

  /* ── Derived metrics ── */
  const total = stats?.total_assessments ?? 0
  const dist = stats?.risk_distribution ?? {}
  const lowCnt = dist.Low ?? 0
  const modCnt = dist.Moderate ?? 0
  const highCnt = (dist.Higher ?? 0) + (dist.High ?? 0)
  const recent = stats?.recent_assessments ?? []
  const higherRiskShare = pct(highCnt, total)

  // Donut chart data
  const pieData = Object.entries(dist)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }))

  // Module distribution
  const moduleCounts = stats?.module_distribution ?? {}
  const moduleBarData = DISEASE_MODULES.map(m => ({
    name: m.name.replace(' Risk', ''),
    Assessments: moduleCounts[m.id] ?? 0,
    fill: m.accent,
  }))

  // Area trend data
  const areaData = (stats?.daily_assessments ?? []).map(item => ({
    day: new Date(`${item.date}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    }),
    Assessments: item.count,
  }))

  // Filtered recent activity
  const filteredRecent = recent.filter(r => {
    if (activityFilter === 'all') return true
    return r.disease_module === activityFilter
  })

  return (
    <div className="fin-dashboard">
      {/* ── Topbar ── */}
      <div className="fin-topbar">
        <div className="fin-topbar-left">
          <div className="fin-topbar-title">
            <span className="fin-live-dot" />
            <span>HealthPredict AI</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'rgba(16,217,140,0.12)', color: '#10d98c', border: '1px solid rgba(16,217,140,0.25)' }}>
              ● 4 Active AI Modules
            </span>
          </div>
          <div className="fin-topbar-sub">
            {getGreeting()} · Clinical Decision Support & Risk Intelligence Hub
          </div>
        </div>

        <div className="fin-topbar-right">
          <div className="fin-time-badge">
            <span>🕒 {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <strong>{now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</strong>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh statistics"
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(360deg)' : 'none', transition: 'transform 0.6s' }}>
              ↻
            </span>
            {refreshing ? 'Updating…' : 'Refresh'}
          </button>

          <Link to="/assessment" className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '9px 18px' }}>
            + Launch Assessment
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <span className="alert-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* ── Quick Disease Launchpad (4 Hero Cards) ── */}
      <div className="launchpad-section">
        <div className="launchpad-header">
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              🧬 Assessment Engines
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'rgba(226,234,248,0.5)' }}>
              Select a specialized disease risk pipeline to begin preliminary screening
            </span>
          </div>
          <Link to="/assessment" style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4f9eff' }}>
            View All Steps →
          </Link>
        </div>

        <div className="launchpad-grid">
          {DISEASE_MODULES.map(m => {
            const count = moduleCounts[m.id] ?? 0
            return (
              <div
                key={m.id}
                className="disease-card"
                style={{
                  '--module-accent': m.accent,
                  '--module-rgb': m.rgb,
                }}
                onClick={() => navigate(`/assessment?module=${m.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(`/assessment?module=${m.id}`)}
              >
                <div className="disease-top">
                  <div className="disease-icon-box">
                    {m.icon}
                  </div>
                  <span className="disease-badge">● Active</span>
                </div>

                <div className="disease-name">{m.name}</div>
                <div className="disease-desc">{m.desc}</div>

                <div className="disease-bottom">
                  <div className="disease-stats">
                    <strong>{count}</strong> {count === 1 ? 'assessment' : 'assessments'}
                  </div>
                  <span className="disease-action-btn">
                    Screen →
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Row 1: Gauge + Core KPI Cards ── */}
      <div className="fin-row1">
        {/* Gauge card */}
        <div className="fin-gauge-card">
          <div className="fin-section-label" style={{ marginBottom: 12 }}>
            Overall Risk Exposure
          </div>
          <RiskGauge score={higherRiskShare} label="Higher / High Category Share" />
          <div className="gauge-sublabels">
            Proportion of stored records classified as Higher or High risk
          </div>
          <div className="fin-disclaimer-chip">
            🛡️ AI Preliminary Assessment Only
          </div>
        </div>

        {/* KPI Grid */}
        <div className="fin-kpi-grid">
          <KpiCard
            label="Total Assessments"
            value={total}
            icon="📋"
            accent="#4f9eff"
            subtext="Validated model evaluations"
          />
          <KpiCard
            label="Low Risk"
            value={lowCnt}
            icon="🟢"
            accent="#10d98c"
            subtext={`${pct(lowCnt, total)}% of recorded patients`}
          />
          <KpiCard
            label="Moderate Risk"
            value={modCnt}
            icon="🟡"
            accent="#f5a623"
            subtext={`${pct(modCnt, total)}% of recorded patients`}
          />
          <KpiCard
            label="High / Higher Risk"
            value={highCnt}
            icon="🔴"
            accent="#ff5a87"
            subtext={`${pct(highCnt, total)}% flagged for review`}
          />
        </div>
      </div>

      {/* ── Row 2: 30-Day Trend Area Chart + Donut Distribution ── */}
      <div className="fin-row2">
        {/* Area chart */}
        <div className="fin-chart-card">
          <div className="fin-chart-header">
            <div>
              <div className="fin-section-label">Assessment Activity Trend</div>
              <div className="fin-chart-sub">30-day daily screening volume</div>
            </div>
            <div className="fin-chart-legend">
              <span className="legend-dot" style={{ background: '#4f9eff' }} /> Assessments
            </div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={areaData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f9eff" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#4f9eff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: 'rgba(226,234,248,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v, i) => (i % 5 === 0 ? v : '')}
              />
              <YAxis
                tick={{ fill: 'rgba(226,234,248,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Assessments"
                stroke="#4f9eff"
                strokeWidth={2.5}
                fill="url(#areaGlow)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="fin-chart-card">
          <div className="fin-section-label">Risk Category Mix</div>
          <div className="fin-chart-sub" style={{ marginBottom: 8 }}>Categorical distribution</div>
          {pieData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: 'rgba(226,234,248,0.25)', fontSize: '0.88rem' }}>
              Run an assessment to view categorical breakdown
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={78}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomLabel}
                    paddingAngle={4}
                  >
                    {pieData.map(d => (
                      <Cell
                        key={d.name}
                        fill={RISK_COLORS[d.name] || '#4f9eff'}
                        stroke="rgba(0,0,0,0.4)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-legend">
                {pieData.map(d => (
                  <div key={d.name} className="donut-legend-row">
                    <span className="donut-dot" style={{ background: RISK_COLORS[d.name] }} />
                    <span className="donut-label">{d.name}</span>
                    <span className="donut-count">{d.value}</span>
                    <span className="donut-pct">{pct(d.value, total)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Module Activity Bar Chart + Risk Heatmap ── */}
      <div className="fin-row3">
        {/* Module Bar Chart */}
        <div className="fin-chart-card">
          <div className="fin-chart-header">
            <div>
              <div className="fin-section-label">Assessments by Disease Module</div>
              <div className="fin-chart-sub">Volume breakdown across the 4 specialized models</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={moduleBarData} layout="vertical" margin={{ top: 8, right: 24, left: 16, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(226,234,248,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'rgba(226,234,248,0.7)', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="Assessments" radius={[0, 6, 6, 0]}>
                {moduleBarData.map(entry => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Category Breakdown Bars */}
        <div className="fin-chart-card">
          <div className="fin-section-label" style={{ marginBottom: 4 }}>
            Risk Threshold Distribution
          </div>
          <div className="fin-chart-sub" style={{ marginBottom: 16 }}>
            Percentage of total cohort per tier
          </div>

          {[
            { label: 'Low Risk', val: lowCnt, color: '#10d98c' },
            { label: 'Moderate', val: modCnt, color: '#f5a623' },
            { label: 'Higher / High', val: highCnt, color: '#ff5a87' },
          ].map(r => (
            <div key={r.label} className="heatmap-row">
              <span className="heatmap-label">{r.label}</span>
              <div className="heatmap-track">
                <div
                  className="heatmap-fill"
                  style={{
                    width: total ? `${(r.val / total) * 100}%` : '0%',
                    background: `linear-gradient(90deg, ${r.color}88, ${r.color})`,
                  }}
                />
              </div>
              <span className="heatmap-val" style={{ color: r.color }}>{r.val}</span>
              <span className="heatmap-pct">{pct(r.val, total)}%</span>
            </div>
          ))}

          <div style={{ marginTop: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.75rem', color: 'rgba(226,234,248,0.5)' }}>
            💡 <strong>Clinical Note:</strong> Higher-risk assessments automatically highlight primary contributing variables and trigger clinical consultation guidance.
          </div>
        </div>
      </div>

      {/* ── Row 4: Filterable Activity Stream + Quick Launch CTA ── */}
      <div className="fin-row4">
        {/* Activity Stream */}
        <div className="fin-chart-card">
          <div className="fin-chart-header" style={{ marginBottom: 14 }}>
            <div>
              <div className="fin-section-label">Recent Preliminary Assessments</div>
              <div className="fin-chart-sub">Auditable records from machine learning runs</div>
            </div>
            <Link to="/history" className="btn btn-outline btn-sm">
              View History Table →
            </Link>
          </div>

          {/* Module Filter Chips */}
          <div className="filter-chip-group">
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'diabetes', label: '🩸 Diabetes' },
              { id: 'heart_disease', label: '❤️ Heart' },
              { id: 'liver_disease', label: '🫀 Liver' },
              { id: 'kidney_disease', label: '🫘 Kidney' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                className={`filter-chip${activityFilter === f.id ? ' active' : ''}`}
                onClick={() => setActivityFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredRecent.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(226,234,248,0.3)', fontSize: '0.88rem' }}>
              No assessments found for this filter. Run an assessment to see real-time updates.
            </div>
          ) : (
            <div className="activity-feed">
              {filteredRecent.map((record, index) => (
                <ActivityItem key={record.id} record={record} index={index} />
              ))}
            </div>
          )}
        </div>

        {/* Action & Medical Disclaimer Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Quick CTA Card */}
          <div className="fin-cta-card">
            <div className="fin-cta-glow" />
            <div style={{ fontSize: '2rem', marginBottom: 10 }}>⚡</div>
            <h3 style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#fff', marginBottom: 8 }}>
              New Health Assessment
            </h3>
            <p style={{ color: 'rgba(226,234,248,0.6)', fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.6 }}>
              Screen patients across Diabetes, Cardiovascular, Hepatic, and Renal risk categories using calibrated AI models.
            </p>
            <Link to="/assessment" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Launch Full Assessment →
            </Link>
          </div>

          {/* Clinical Governance Card */}
          <div className="fin-safety-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.5)' }}>
                Clinical Governance
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'rgba(226,234,248,0.5)', lineHeight: 1.6 }}>
              All estimates provided by HealthPredict AI represent <strong style={{ color: 'rgba(226,234,248,0.8)' }}>AI-assisted preliminary assessments</strong>. They do not constitute a medical diagnosis. Data is stored anonymously without personal identifiable information (PII).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
