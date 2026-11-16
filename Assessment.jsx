import { Fragment, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { runAssessment } from '../api'

// ---- All available symptoms ----
const ALL_SYMPTOMS = [
  { key: 'fever', label: 'Fever' },
  { key: 'cough', label: 'Cough' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'headache', label: 'Headache' },
  { key: 'chest_discomfort', label: 'Chest discomfort' },
  { key: 'shortness_of_breath', label: 'Shortness of breath' },
  { key: 'increased_thirst', label: 'Increased thirst' },
  { key: 'frequent_urination', label: 'Frequent urination' },
  { key: 'abdominal_pain', label: 'Abdominal pain' },
  { key: 'nausea', label: 'Nausea' },
  { key: 'dizziness', label: 'Dizziness' },
  { key: 'weight_changes', label: 'Weight changes' },
  { key: 'blurred_vision', label: 'Blurred vision' },
  { key: 'slow_healing', label: 'Slow wound healing' },
  { key: 'chest_pain', label: 'Chest pain' },
  { key: 'loss_of_consciousness', label: 'Loss of consciousness' },
  { key: 'sudden_confusion', label: 'Sudden confusion' },
  { key: 'severe_headache', label: 'Severe headache' },
  { key: 'jaundice', label: 'Jaundice (yellowing of skin/eyes)' },
  { key: 'dark_urine', label: 'Dark urine' },
  { key: 'swelling', label: 'Swelling / Oedema' },
  { key: 'blood_in_urine', label: 'Blood in urine' },
]

const URGENT_SYMPTOMS = new Set([
  'chest_discomfort', 'chest_pain', 'shortness_of_breath',
  'loss_of_consciousness', 'sudden_confusion', 'severe_headache',
])

// ---- Disease modules ----
const MODULES = [
  {
    id: 'diabetes',
    label: 'Diabetes',
    icon: '🩸',
    color: '#4f9eff',
    description: 'Assess risk of Type 2 Diabetes based on glucose, BMI, and related factors.',
  },
  {
    id: 'heart_disease',
    label: 'Heart Disease',
    icon: '❤️',
    color: '#ff5a87',
    description: 'Evaluate cardiovascular risk using blood pressure, cholesterol, and ECG indicators.',
  },
  {
    id: 'liver_disease',
    label: 'Liver Disease',
    icon: '🫀',
    color: '#f5a623',
    description: 'Estimate liver disease risk from bilirubin, liver enzymes (ALT/AST), and protein levels.',
  },
  {
    id: 'kidney_disease',
    label: 'Kidney Disease',
    icon: '🫘',
    color: '#10d98c',
    description: 'Screen for chronic kidney disease risk using creatinine, blood urea, and urine tests.',
  },
]

// ---- Step labels ----
const STEPS = [
  { label: 'Module', icon: '🧬' },
  { label: 'Patient Info', icon: '👤' },
  { label: 'Symptoms', icon: '🩺' },
  { label: 'Clinical Data', icon: '📊' },
  { label: 'Review & Run', icon: '🔍' },
  { label: 'Results', icon: '📋' },
]

// ---- Risk colour map ----
const RISK_CLASS = {
  Low: 'risk-low',
  Moderate: 'risk-moderate',
  Higher: 'risk-higher',
  High: 'risk-high',
}

// ---- Probability bar ----
function ProbabilityBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const col = value < 0.3 ? '#10d98c' : value < 0.55 ? '#f5a623' : value < 0.75 ? '#ff7b3a' : '#ff3a5c'
  return (
    <div className="probability-bar-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: '0.78rem', color: 'rgba(226,234,248,0.5)' }}>Estimated model probability</span>
        <span style={{ fontWeight: 700, color: col }}>{pct}%</span>
      </div>
      <div className="probability-bar-track">
        <div className="probability-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${col}88, ${col})` }} />
      </div>
    </div>
  )
}

// ---- Input with unit ----
function UnitInput({ id, label, unit, value, onChange, placeholder, min, max, hint, required, step }) {
  return (
    <div className="form-group">
      <label htmlFor={id} className="form-label">
        {label} {required && <span className="req">*</span>}
      </label>
      <div className="input-group">
        <input
          id={id}
          type="number"
          className="form-input"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step || 'any'}
          required={required}
        />
        {unit && <span className="input-suffix">{unit}</span>}
      </div>
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )
}

// ---- Main Assessment page ----
export default function Assessment() {
  const [searchParams] = useSearchParams()
  const moduleQuery = searchParams.get('module')

  const [step, setStep] = useState(moduleQuery && MODULES.some(m => m.id === moduleQuery) ? 1 : 0)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Module selection
  const [selectedModule, setSelectedModule] = useState(
    moduleQuery && MODULES.some(m => m.id === moduleQuery) ? moduleQuery : ''
  )

  useEffect(() => {
    if (moduleQuery && MODULES.some(m => m.id === moduleQuery)) {
      setSelectedModule(moduleQuery)
      setStep(1)
    }
  }, [moduleQuery])

  // Patient info
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')

  // Symptoms
  const [selectedSymptoms, setSelectedSymptoms] = useState(new Set())

  // ---- Diabetes fields ----
  const [glucose, setGlucose] = useState('')
  const [bp, setBp] = useState('')
  const [skinThick, setSkinThick] = useState('')
  const [insulin, setInsulin] = useState('')
  const [bmi, setBmi] = useState('')

  // ---- Heart Disease fields ----
  const [cholesterol, setCholesterol] = useState('')
  const [maxHR, setMaxHR] = useState('')
  const [fastingBS, setFastingBS] = useState('')
  const [stDepression, setStDepression] = useState('')
  const [exerciseAngina, setExerciseAngina] = useState('')

  // ---- Liver Disease fields ----
  const [totalBilirubin, setTotalBilirubin] = useState('')
  const [directBilirubin, setDirectBilirubin] = useState('')
  const [alp, setAlp] = useState('')
  const [alt, setAlt] = useState('')
  const [ast, setAst] = useState('')
  const [totalProteins, setTotalProteins] = useState('')
  const [albumin, setAlbumin] = useState('')
  const [agRatio, setAgRatio] = useState('')

  // ---- Kidney Disease fields ----
  const [kidneyBP, setKidneyBP] = useState('')
  const [specificGravity, setSpecificGravity] = useState('')
  const [albuminUrine, setAlbuminUrine] = useState('')
  const [sugarUrine, setSugarUrine] = useState('')
  const [bloodGlucose, setBloodGlucose] = useState('')
  const [bloodUrea, setBloodUrea] = useState('')
  const [creatinine, setCreatinine] = useState('')
  const [haemoglobin, setHaemoglobin] = useState('')
  const [pcv, setPcv] = useState('')

  // Auto-calculate BMI
  const calcBmi = () => {
    if (height && weight) {
      const h = parseFloat(height) / 100
      return h > 0 ? (parseFloat(weight) / (h * h)).toFixed(1) : ''
    }
    return ''
  }

  const toggleSymptom = key => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const urgentSelected = [...selectedSymptoms].some(s => URGENT_SYMPTOMS.has(s))

  // ---- Validation per step ----
  const stepValid = () => {
    if (step === 0) return !!selectedModule
    if (step === 1) {
      return Number(age) >= 1 && Number(age) <= 120 &&
        ['female', 'male', 'other'].includes(sex) &&
        Number(height) >= 50 && Number(height) <= 300 &&
        Number(weight) > 0 && Number(weight) <= 600
    }
    return true
  }

  // ---- Build payload ----
  const buildPayload = () => {
    const base = {
      age: parseInt(age),
      sex,
      height: parseFloat(height),
      weight: parseFloat(weight),
      symptoms: [...selectedSymptoms],
    }

    if (selectedModule === 'diabetes') {
      return {
        ...base,
        glucose: glucose ? parseFloat(glucose) : null,
        blood_pressure: bp ? parseFloat(bp) : null,
        skin_thickness: skinThick ? parseFloat(skinThick) : null,
        insulin: insulin ? parseFloat(insulin) : null,
        bmi: bmi ? parseFloat(bmi) : (calcBmi() ? parseFloat(calcBmi()) : null),
      }
    }

    if (selectedModule === 'heart_disease') {
      return {
        ...base,
        blood_pressure: bp ? parseFloat(bp) : null,
        cholesterol: cholesterol ? parseFloat(cholesterol) : null,
        max_heart_rate: maxHR ? parseFloat(maxHR) : null,
        fasting_blood_sugar: fastingBS ? parseFloat(fastingBS) : null,
        st_depression: stDepression ? parseFloat(stDepression) : null,
        exercise_angina: exerciseAngina === 'yes',
      }
    }

    if (selectedModule === 'liver_disease') {
      return {
        ...base,
        total_bilirubin: totalBilirubin ? parseFloat(totalBilirubin) : null,
        direct_bilirubin: directBilirubin ? parseFloat(directBilirubin) : null,
        alkaline_phosphotase: alp ? parseFloat(alp) : null,
        alamine_aminotransferase: alt ? parseFloat(alt) : null,
        aspartate_aminotransferase: ast ? parseFloat(ast) : null,
        total_proteins: totalProteins ? parseFloat(totalProteins) : null,
        albumin: albumin ? parseFloat(albumin) : null,
        albumin_globulin_ratio: agRatio ? parseFloat(agRatio) : null,
      }
    }

    if (selectedModule === 'kidney_disease') {
      return {
        ...base,
        blood_pressure: kidneyBP ? parseFloat(kidneyBP) : null,
        specific_gravity: specificGravity ? parseFloat(specificGravity) : null,
        albumin_urine: albuminUrine ? parseFloat(albuminUrine) : null,
        sugar_urine: sugarUrine ? parseFloat(sugarUrine) : null,
        blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
        blood_urea: bloodUrea ? parseFloat(bloodUrea) : null,
        serum_creatinine: creatinine ? parseFloat(creatinine) : null,
        haemoglobin: haemoglobin ? parseFloat(haemoglobin) : null,
        packed_cell_volume: pcv ? parseFloat(pcv) : null,
      }
    }

    return base
  }

  // ---- Submit ----
  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await runAssessment(buildPayload(), selectedModule)
      setResult(data)
      setStep(5)
    } catch (err) {
      const detail = err?.response?.data?.detail
      const message = Array.isArray(detail)
        ? detail.map(item => item.msg).join(' ')
        : detail
      setError(typeof message === 'string' ? message : 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setStep(0); setResult(null); setError(null); setSelectedModule('')
    setAge(''); setSex(''); setHeight(''); setWeight('')
    setSelectedSymptoms(new Set())
    setGlucose(''); setBp(''); setSkinThick(''); setInsulin(''); setBmi('')
    setCholesterol(''); setMaxHR(''); setFastingBS(''); setStDepression(''); setExerciseAngina('')
    setTotalBilirubin(''); setDirectBilirubin(''); setAlp(''); setAlt(''); setAst('')
    setTotalProteins(''); setAlbumin(''); setAgRatio('')
    setKidneyBP(''); setSpecificGravity(''); setAlbuminUrine(''); setSugarUrine('')
    setBloodGlucose(''); setBloodUrea(''); setCreatinine(''); setHaemoglobin(''); setPcv('')
  }

  const activeModule = MODULES.find(m => m.id === selectedModule)

  return (
    <div className="page-container">
      {/* Page header */}
      <div className="page-header">
        <h1>🧬 <span className="gradient-text">AI-Assisted Preliminary Assessment</span></h1>
        <p>
          Clinical Decision Support — select a disease module to begin.
          This is <strong>not</strong> a medical diagnosis.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" style={{ marginBottom: 28 }}>
        <strong>⚠️ Medical Disclaimer:</strong> This tool provides an AI-assisted preliminary
        assessment based on the available input data. It cannot replace professional medical
        diagnosis, clinical evaluation, or laboratory testing. Always consult a qualified
        healthcare professional for any health concerns.
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        {STEPS.map((s, i) => (
          <Fragment key={s.label}>
            <div className={`step-item${i === step ? ' active' : i < step || step === 5 ? ' done' : ''}`}>
              <div className="step-num">
                {(i < step || step === 5) ? '✓' : i + 1}
              </div>
              <span className="step-label">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="step-divider" />}
          </Fragment>
        ))}
      </div>

      {/* Step 0 — Module Selection */}
      {step === 0 && (
        <div className="card fade-in-up">
          <div className="section-header">
            <div className="section-header-icon">🧬</div>
            <div>
              <div className="section-title">Select Assessment Module</div>
              <div className="section-subtitle">Choose the disease risk module you want to assess</div>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 16 }}>
            {MODULES.map(mod => (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedModule(mod.id)}
                style={{
                  background: selectedModule === mod.id
                    ? `linear-gradient(135deg, ${mod.color}22, ${mod.color}11)`
                    : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${selectedModule === mod.id ? mod.color : 'rgba(226,234,248,0.1)'}`,
                  borderRadius: 14,
                  padding: '20px 18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'inherit',
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: 10 }}>{mod.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: selectedModule === mod.id ? mod.color : 'rgba(226,234,248,0.9)', marginBottom: 6 }}>
                  {mod.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(226,234,248,0.45)', lineHeight: 1.5 }}>
                  {mod.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1 — Patient Information */}
      {step === 1 && (
        <div className="card fade-in-up">
          <div className="section-header">
            <div className="section-header-icon">👤</div>
            <div>
              <div className="section-title">Patient Information</div>
              <div className="section-subtitle">General demographic information — no personally identifying data is stored</div>
            </div>
          </div>
          <div className="grid-2" style={{ gap: 20 }}>
            <UnitInput id="age" label="Age" unit="yrs" value={age} onChange={setAge}
              placeholder="35" min={1} max={120} required />
            <div className="form-group">
              <label htmlFor="sex" className="form-label">Biological sex <span className="req">*</span></label>
              <select id="sex" className="form-select" value={sex} onChange={e => setSex(e.target.value)}>
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other / Prefer not to say</option>
              </select>
            </div>
            <UnitInput id="height" label="Height" unit="cm" value={height} onChange={setHeight}
              placeholder="165" min={50} max={300} required />
            <UnitInput id="weight" label="Weight" unit="kg" value={weight} onChange={setWeight}
              placeholder="70" min={1} max={600} required />
          </div>
          {height && weight && (
            <div className="alert alert-info" style={{ marginTop: 16 }}>
              <span className="alert-icon">📐</span>
              <span>Calculated BMI: <strong>{calcBmi()}</strong> kg/m²</span>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Symptoms */}
      {step === 2 && (
        <div className="card fade-in-up">
          <div className="section-header">
            <div className="section-header-icon">🩺</div>
            <div>
              <div className="section-title">Symptoms</div>
              <div className="section-subtitle">Select all currently experienced symptoms</div>
            </div>
          </div>

          {urgentSelected && (
            <div className="alert alert-emergency" style={{ marginBottom: 20 }}>
              <span className="alert-icon">🚨</span>
              <div>
                <strong>Safety Notice:</strong> Some reported symptoms may require prompt medical
                attention. Seek appropriate medical care or emergency services based on the
                severity of your symptoms. Do not rely solely on this tool.
              </div>
            </div>
          )}

          <div className="symptom-grid">
            {ALL_SYMPTOMS.map(s => {
              const isUrgent = URGENT_SYMPTOMS.has(s.key)
              const isSelected = selectedSymptoms.has(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`symptom-chip${isSelected ? ' selected' : ''}`}
                  onClick={() => toggleSymptom(s.key)}
                  style={isUrgent ? { borderColor: isSelected ? '#ff5a87' : 'rgba(255,90,135,0.3)' } : {}}
                  aria-pressed={isSelected}
                >
                  <div className="chip-dot" style={isUrgent ? { borderColor: '#ff5a87' } : {}}>
                    <span className="chip-check">✓</span>
                  </div>
                  <span>{isUrgent ? '⚠️ ' : ''}{s.label}</span>
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'rgba(226,234,248,0.4)' }}>
            ⚠️ Marked symptoms may indicate urgent conditions — seek immediate medical care if severe.
          </div>
        </div>
      )}

      {/* Step 3 — Clinical Measurements (module-specific) */}
      {step === 3 && (
        <div className="card fade-in-up">
          <div className="section-header">
            <div className="section-header-icon">📊</div>
            <div>
              <div className="section-title">Clinical Measurements</div>
              <div className="section-subtitle">
                {activeModule?.label} parameters — all optional, model uses reference values for missing fields
              </div>
            </div>
          </div>

          {/* ---- Diabetes Fields ---- */}
          {selectedModule === 'diabetes' && (
            <div className="grid-2" style={{ gap: 20 }}>
              <UnitInput id="glucose" label="Blood Glucose" unit="mg/dL" value={glucose} onChange={setGlucose}
                placeholder="117" min={0} max={1000} hint="2-hour plasma glucose concentration" />
              <UnitInput id="bp" label="Diastolic Blood Pressure" unit="mmHg" value={bp} onChange={setBp}
                placeholder="72" min={0} max={200} hint="Diastolic (lower) BP reading" />
              <UnitInput id="skin" label="Skin Fold Thickness" unit="mm" value={skinThick} onChange={setSkinThick}
                placeholder="23" min={0} max={100} hint="Triceps skinfold — body fat proxy" />
              <UnitInput id="insulin" label="Serum Insulin" unit="μU/mL" value={insulin} onChange={setInsulin}
                placeholder="79" min={0} max={1000} hint="2-hour serum insulin level" />
              <div className="form-group">
                <label htmlFor="bmi-field" className="form-label">BMI</label>
                <div className="input-group">
                  <input id="bmi-field" type="number" className="form-input"
                    value={bmi || calcBmi()} onChange={e => setBmi(e.target.value)}
                    placeholder={calcBmi() || '25.7'} min={10} max={100} step="0.1" />
                  <span className="input-suffix">kg/m²</span>
                </div>
                {calcBmi() && !bmi && (
                  <span className="form-hint" style={{ color: 'rgba(0,229,195,0.7)' }}>
                    Auto-calculated: {calcBmi()}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ---- Heart Disease Fields ---- */}
          {selectedModule === 'heart_disease' && (
            <div className="grid-2" style={{ gap: 20 }}>
              <UnitInput id="hd-bp" label="Resting Blood Pressure" unit="mmHg" value={bp} onChange={setBp}
                placeholder="130" min={50} max={220} hint="Systolic resting blood pressure" />
              <UnitInput id="chol" label="Serum Cholesterol" unit="mg/dL" value={cholesterol} onChange={setCholesterol}
                placeholder="246" min={50} max={600} hint="Total serum cholesterol" />
              <UnitInput id="maxhr" label="Max Heart Rate Achieved" unit="bpm" value={maxHR} onChange={setMaxHR}
                placeholder="150" min={60} max={220} hint="Maximum HR during exercise test" />
              <UnitInput id="fbs" label="Fasting Blood Sugar" unit="mg/dL" value={fastingBS} onChange={setFastingBS}
                placeholder="100" min={50} max={400} hint=">120 mg/dL is flagged as elevated" />
              <UnitInput id="oldpeak" label="ST Depression (Oldpeak)" unit="" value={stDepression} onChange={setStDepression}
                placeholder="1.0" min={0} max={10} step="0.1" hint="ST depression induced by exercise relative to rest" />
              <div className="form-group">
                <label htmlFor="exang" className="form-label">Exercise-Induced Angina</label>
                <select id="exang" className="form-select" value={exerciseAngina} onChange={e => setExerciseAngina(e.target.value)}>
                  <option value="">Not known</option>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          )}

          {/* ---- Liver Disease Fields ---- */}
          {selectedModule === 'liver_disease' && (
            <div className="grid-2" style={{ gap: 20 }}>
              <UnitInput id="tbil" label="Total Bilirubin" unit="mg/dL" value={totalBilirubin} onChange={setTotalBilirubin}
                placeholder="1.0" min={0} max={80} hint="Normal: 0.2–1.2 mg/dL" />
              <UnitInput id="dbil" label="Direct Bilirubin" unit="mg/dL" value={directBilirubin} onChange={setDirectBilirubin}
                placeholder="0.25" min={0} max={20} hint="Normal: 0–0.3 mg/dL" />
              <UnitInput id="alp" label="Alkaline Phosphatase (ALP)" unit="IU/L" value={alp} onChange={setAlp}
                placeholder="208" min={0} max={3000} hint="Normal: 44–147 IU/L" />
              <UnitInput id="alt" label="ALT (SGPT)" unit="IU/L" value={alt} onChange={setAlt}
                placeholder="35" min={0} max={3000} hint="Normal: 7–56 IU/L" />
              <UnitInput id="ast" label="AST (SGOT)" unit="IU/L" value={ast} onChange={setAst}
                placeholder="36" min={0} max={5000} hint="Normal: 10–40 IU/L" />
              <UnitInput id="tp" label="Total Proteins" unit="g/dL" value={totalProteins} onChange={setTotalProteins}
                placeholder="6.8" min={0} max={15} hint="Normal: 6.0–8.3 g/dL" />
              <UnitInput id="alb" label="Albumin" unit="g/dL" value={albumin} onChange={setAlbumin}
                placeholder="3.2" min={0} max={8} hint="Normal: 3.5–5.0 g/dL" />
              <UnitInput id="agr" label="Albumin/Globulin Ratio" unit="" value={agRatio} onChange={setAgRatio}
                placeholder="0.95" min={0} max={5} step="0.01" hint="Normal: >1.0" />
            </div>
          )}

          {/* ---- Kidney Disease Fields ---- */}
          {selectedModule === 'kidney_disease' && (
            <div className="grid-2" style={{ gap: 20 }}>
              <UnitInput id="kbp" label="Blood Pressure" unit="mmHg" value={kidneyBP} onChange={setKidneyBP}
                placeholder="74" min={40} max={200} hint="Systolic BP reading" />
              <UnitInput id="sg" label="Urine Specific Gravity" unit="" value={specificGravity} onChange={setSpecificGravity}
                placeholder="1.018" min={1.001} max={1.030} step="0.001" hint="Normal: 1.005–1.030" />
              <UnitInput id="al" label="Albumin in Urine" unit="(0–5)" value={albuminUrine} onChange={setAlbuminUrine}
                placeholder="0" min={0} max={5} step="1" hint="0=None, 1–5=Increasing proteinuria" />
              <UnitInput id="su" label="Sugar in Urine" unit="(0–5)" value={sugarUrine} onChange={setSugarUrine}
                placeholder="0" min={0} max={5} step="1" hint="0=None, 1–5=Increasing glucosuria" />
              <UnitInput id="bgr" label="Random Blood Glucose" unit="mg/dL" value={bloodGlucose} onChange={setBloodGlucose}
                placeholder="120" min={40} max={500} hint="Random blood glucose level" />
              <UnitInput id="bu" label="Blood Urea" unit="mg/dL" value={bloodUrea} onChange={setBloodUrea}
                placeholder="38" min={0} max={400} hint="Normal: 7–25 mg/dL" />
              <UnitInput id="sc" label="Serum Creatinine" unit="mg/dL" value={creatinine} onChange={setCreatinine}
                placeholder="1.0" min={0} max={80} step="0.1" hint="Normal: 0.6–1.2 mg/dL" />
              <UnitInput id="hemo" label="Haemoglobin" unit="g/dL" value={haemoglobin} onChange={setHaemoglobin}
                placeholder="13.5" min={2} max={20} step="0.1" hint="Normal: 12–17 g/dL" />
              <UnitInput id="pcv" label="Packed Cell Volume" unit="%" value={pcv} onChange={setPcv}
                placeholder="41" min={9} max={55} hint="Normal: 36–50%" />
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Review & Run */}
      {step === 4 && (
        <div className="card fade-in-up">
          <div className="section-header">
            <div className="section-header-icon">🔍</div>
            <div>
              <div className="section-title">Review & Run Assessment</div>
              <div className="section-subtitle">
                Review inputs before running the {activeModule?.label} Risk model
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 16, marginBottom: 24 }}>
            <div className="card-sm">
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.4)', marginBottom: 12 }}>Patient Info</div>
              <table className="data-table" style={{ fontSize: '0.85rem' }}>
                <tbody>
                  {[
                    ['Module', `${activeModule?.icon} ${activeModule?.label}`],
                    ['Age', `${age} yrs`],
                    ['Sex', sex],
                    ['Height', `${height} cm`],
                    ['Weight', `${weight} kg`],
                    ['BMI', `${calcBmi() || '—'} kg/m²`],
                  ].map(([k, v]) => (
                    <tr key={k}><td style={{ color: 'rgba(226,234,248,0.5)', paddingLeft: 0 }}>{k}</td><td style={{ fontWeight: 600 }}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-sm">
              <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.4)', marginBottom: 12 }}>Symptoms Selected</div>
              {selectedSymptoms.size === 0 ? (
                <span style={{ fontSize: '0.82rem', color: 'rgba(226,234,248,0.35)' }}>None selected</span>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {[...selectedSymptoms].map(s => {
                    const sym = ALL_SYMPTOMS.find(x => x.key === s)
                    return (
                      <span key={s} style={{
                        padding: '3px 10px', borderRadius: 99,
                        background: URGENT_SYMPTOMS.has(s) ? 'rgba(255,90,135,0.12)' : 'rgba(79,158,255,0.12)',
                        color: URGENT_SYMPTOMS.has(s) ? '#ff5a87' : '#4f9eff',
                        fontSize: '0.75rem', fontWeight: 600,
                      }}>{sym?.label || s}</span>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {urgentSelected && (
            <div className="alert alert-emergency" style={{ marginBottom: 20 }}>
              <span className="alert-icon">🚨</span>
              <div>
                <strong>Safety Notice:</strong> Some reported symptoms may require prompt medical
                attention. Seek appropriate medical care or emergency services based on the
                severity of your symptoms.
              </div>
            </div>
          )}

          <div className="disclaimer-banner">
            <strong>Before running:</strong> The {activeModule?.label} Risk model will provide an <em>estimated
              risk category</em> based on the information provided. This is an AI-assisted preliminary
            assessment — it does NOT confirm or diagnose any medical condition. Missing optional
            model inputs are handled using reference values, which may reduce individual accuracy.
          </div>

          {error && (
            <div className="alert alert-warning" style={{ marginTop: 16 }}>
              <span className="alert-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Step 5 — Results */}
      {step === 5 && result && (
        <div className="result-container fade-in-up" aria-live="polite">
          {result.emergency_notice && (
            <div className="alert alert-emergency" style={{ marginBottom: 24 }}>
              <span className="alert-icon">🚨</span>
              <div>{result.emergency_notice}</div>
            </div>
          )}

          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(226,234,248,0.45)', marginBottom: 6 }}>
              {result.assessment_type}
            </div>
            <div className="result-risk-header">
              <span className="result-condition">{result.condition} Risk</span>
              <span className={`risk-badge ${RISK_CLASS[result.risk_level] || 'risk-moderate'}`}>
                ● {result.risk_level} Predicted Risk
              </span>
            </div>
            {result.probability != null && (
              <ProbabilityBar value={result.probability} />
            )}
          </div>

          {result.contributing_factors?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12 }}>Contributing Factors</h4>
              <ul className="contributing-list">
                {result.contributing_factors.map((f, i) => (
                  <li key={i} className="contributing-item">
                    <div className="contributing-dot" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card-sm" style={{ marginBottom: 20, background: 'rgba(255,255,255,0.02)' }}>
            <h4 style={{ marginBottom: 10, color: 'rgba(226,234,248,0.7)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Interpretation</h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{result.message}</p>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            <span className="alert-icon">💡</span>
            <div>
              <strong>Recommended Next Step</strong><br />
              {result.recommendation}
            </div>
          </div>

          <div className="disclaimer-banner">
            <strong>⚠️ Important:</strong> {result.disclaimer}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={resetForm}>
              🔄 New Assessment
            </button>
            <button className="btn btn-outline" onClick={() => window.print()}>
              🖨️ Print / Save
            </button>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            ← Back
          </button>

          {step < 4 ? (
            <button
              className="btn btn-primary"
              onClick={() => setStep(s => s + 1)}
              disabled={!stepValid()}
            >
              Continue →
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg pulse-glow"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Running Assessment…
                </>
              ) : `🧬 Run ${activeModule?.label || 'AI'} Assessment`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
