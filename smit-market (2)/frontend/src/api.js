import axios from 'axios'

const api = axios.create({ baseURL: '/api' })
api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token')
  if (t) c.headers.Authorization = `Bearer ${t}`
  return c
})

export const errMsg = (e) => e.response?.data?.error || 'Something went wrong. Check that the backend is running and try again.'
export const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`
export const CATEGORIES = ['Books and Notes', 'Electronics', 'Stationery', 'Hostel Essentials', 'Clothing', 'Cycles and Sports', 'Other Items']
export const CONDITIONS = ['New', 'Good', 'Fair']
export default api
