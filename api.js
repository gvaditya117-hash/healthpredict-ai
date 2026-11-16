import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

/** Run assessment — POST /api/v1/assessment?module=diabetes */
export const runAssessment = (payload, module = 'diabetes') =>
  api.post(`/assessment?module=${module}`, payload).then(r => r.data)

/** Fetch assessment history */
export const fetchHistory = (params = {}) =>
  api.get('/assessments', { params }).then(r => r.data)

/** Fetch dashboard statistics */
export const fetchDashboard = () =>
  api.get('/dashboard').then(r => r.data)

export default api
