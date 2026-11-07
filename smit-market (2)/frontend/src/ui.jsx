import { createContext, useCallback, useContext, useEffect, useState } from 'react'

const T = createContext(() => {})
export const useToast = () => useContext(T)

export function ToastProvider({ children }) {
  const [list, setList] = useState([])
  const push = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setList((l) => [...l, { id, msg }])
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2800)
  }, [])
  return (
    <T.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
        {list.map((t) => <div key={t.id} className="rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-lg">{t.msg}</div>)}
      </div>
    </T.Provider>
  )
}

export function useDebounced(v, ms = 350) {
  const [d, setD] = useState(v)
  useEffect(() => { const t = setTimeout(() => setD(v), ms); return () => clearTimeout(t) }, [v, ms])
  return d
}

const read = () => { try { return JSON.parse(localStorage.getItem('saved') || '[]') } catch { return [] } }
export function useSaved() {
  const [ids, setIds] = useState(read)
  useEffect(() => {
    const h = () => setIds(read())
    window.addEventListener('saved-change', h)
    return () => window.removeEventListener('saved-change', h)
  }, [])
  const toggle = (id) => {
    const cur = read()
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    try { localStorage.setItem('saved', JSON.stringify(next)) } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event('saved-change'))
  }
  return { ids, has: (id) => ids.includes(id), toggle }
}

export const Skeleton = () => (
  <div className="animate-pulse overflow-hidden rounded-2xl border border-navy/10">
    <div className="h-44 bg-navy-50" />
    <div className="space-y-3 p-4"><div className="h-4 w-3/4 rounded bg-navy-50" /><div className="h-4 w-1/3 rounded bg-navy-50" /><div className="h-10 rounded-xl bg-navy-50" /></div>
  </div>
)
