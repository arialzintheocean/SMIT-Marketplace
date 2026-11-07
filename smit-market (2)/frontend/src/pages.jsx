import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Pencil, Trash2, CheckCircle2, RotateCcw, ImagePlus } from 'lucide-react'
import api, { errMsg, inr, CATEGORIES, CONDITIONS } from './api'
import { useAuth } from './auth'
import { ProductCard, ContactButtons, Cover, Badge } from './components'
import { useToast, useDebounced, useSaved, Skeleton } from './ui'

const Err = ({ m }) => m ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{m}</p> : null
const Field = ({ label, children }) => <label className="block space-y-1 text-sm font-bold">{label}{children}</label>

export function Protected({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <p className="p-8 text-center">Loading…</p>
  return user ? children : <Navigate to="/login" replace />
}

export function Home() {
  const [sp] = useSearchParams()
  const q = sp.get('q') || ''
  const empty = { category: '', min: '', max: '', sort: '' }
  const [f, setF] = useState(empty)
  const df = useDebounced(f)
  const [items, setItems] = useState(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const fetchPage = (pg) => api.get('/products', { params: { q, ...df, page: pg, limit: 12 } })

  useEffect(() => {
    setError(''); setItems(null); setPage(1)
    fetchPage(1).then((r) => { setItems(r.data); setTotal(Number(r.headers['x-total-count']) || r.data.length) }).catch((e) => setError(errMsg(e)))
  }, [q, df])

  const loadMore = () => {
    setMore(true)
    fetchPage(page + 1).then((r) => { setItems((i) => [...i, ...r.data]); setPage(page + 1) }).catch((e) => setError(errMsg(e))).finally(() => setMore(false))
  }

  return (
    <>
      <section className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">Buy and sell on the SMIT campus</h1>
          <p className="mt-2 max-w-xl text-white/80">Find notes, cycles and hostel essentials from students nearby, then message the seller on WhatsApp in one tap.</p>
        </div>
      </section>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <select className="input" value={f.category} onChange={set('category')}><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <input className="input" type="number" min="0" placeholder="Min price (₹)" value={f.min} onChange={set('min')} />
          <input className="input" type="number" min="0" placeholder="Max price (₹)" value={f.max} onChange={set('max')} />
          <select className="input" value={f.sort} onChange={set('sort')}><option value="">Newest first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select>
          <button className="btn-ghost" onClick={() => setF(empty)}>Clear filters</button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <p>{q ? <>Results for <b>“{q}”</b></> : 'All available items'}{items && <span className="text-navy/60"> · {total} found</span>}</p>
        </div>
        <Err m={error} />
        {items?.length === 0 && <p className="rounded-2xl bg-mint-50 p-8 text-center">No items match. Try different filters, or <Link className="font-bold underline" to="/sell">list something yourself</Link>.</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items === null && !error && Array.from({ length: 8 }, (_, i) => <Skeleton key={i} />)}
          {items?.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
        {items && items.length < total && <div className="text-center"><button className="btn-ghost" onClick={loadMore} disabled={more}>{more ? 'Loading…' : `Show more (${total - items.length} left)`}</button></div>}
      </div>
    </>
  )
}

function AuthForm({ mode }) {
  const register = mode === 'register'
  const { signIn } = useAuth()
  const nav = useNavigate()
  const [v, setV] = useState({ name: '', email: '', password: '', college_name: 'SMIT' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (register && !v.name.trim()) return setError('Enter your name.')
    if (!/\S+@\S+\.\S+/.test(v.email)) return setError('Enter a valid email address.')
    if (v.password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true); setError('')
    try { const r = await api.post(register ? '/register' : '/login', v); signIn(r.data); nav('/') }
    catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mx-auto my-10 max-w-md space-y-4 rounded-2xl border border-navy/10 p-6">
      <h1 className="font-display text-2xl font-extrabold">{register ? 'Create your account' : 'Log in to SMIT Market'}</h1>
      <Err m={error} />
      {register && <Field label="Full name"><input className="input" value={v.name} onChange={set('name')} /></Field>}
      <Field label="Email"><input className="input" type="email" value={v.email} onChange={set('email')} /></Field>
      <Field label="Password"><input className="input" type="password" value={v.password} onChange={set('password')} /></Field>
      {register && <Field label="College"><input className="input" value={v.college_name} onChange={set('college_name')} /></Field>}
      <button className="btn-navy w-full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}</button>
      <p className="text-center text-sm">{register ? <>Already have an account? <Link className="font-bold underline" to="/login">Log in</Link></> : <>New here? <Link className="font-bold underline" to="/register">Create an account</Link></>}</p>
      {!register && <p className="rounded-xl bg-mint-50 p-3 text-xs">Demo login: <b>demo@smitmarket.local</b> / <b>demo1234</b></p>}
    </form>
  )
}
export const Login = () => <AuthForm mode="login" />
export const Register = () => <AuthForm mode="register" />

export function Details() {
  const { id } = useParams()
  const { user } = useAuth()
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get(`/products/${id}`).then((r) => setP(r.data)).catch((e) => setError(errMsg(e))) }, [id])

  if (error) return <div className="mx-auto max-w-3xl p-6"><Err m={error} /></div>
  if (!p) return <p className="p-8 text-center">Loading…</p>
  const mine = user?.id === p.user_id
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2">
      <Cover src={p.image_url} className="aspect-square w-full rounded-2xl" />
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5"><Badge tone="mint">{p.category}</Badge><Badge>{p.condition}</Badge>{p.status === 'Sold' && <Badge tone="sold">Sold</Badge>}{p.is_demo && <Badge>Demo listing</Badge>}</div>
        <h1 className="font-display text-3xl font-extrabold">{p.name}</h1>
        <p className="font-display text-3xl font-extrabold text-mint-600">{inr(p.price)}</p>
        <p className="whitespace-pre-line text-navy/80">{p.description || 'No description provided.'}</p>
        <div className="rounded-xl bg-navy-50 p-3 text-sm">Sold by <b>{p.seller_name}</b>, {p.seller_college}<br />Listed on {new Date(p.created_at).toLocaleDateString('en-IN')}</div>
        {mine ? <Link to={`/edit/${p.id}`} className="btn-navy"><Pencil size={16} />Edit your listing</Link>
          : user ? <ContactButtons p={p} />
          : <Link to="/login" className="btn-mint w-full">Log in to contact the seller</Link>}
      </div>
    </div>
  )
}

export function ProductForm() {
  const { id } = useParams()
  const toast = useToast()
  const nav = useNavigate()
  const [v, setV] = useState({ name: '', description: '', price: '', category: '', condition: '', image_url: '', contact: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value })

  useEffect(() => { if (id) api.get(`/products/${id}`).then((r) => setV({ ...r.data, price: String(r.data.price) })).catch((e) => setError(errMsg(e))) }, [id])

  const pickImage = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const fd = new FormData(); fd.append('image', file)
    try { const r = await api.post('/upload', fd); setV((x) => ({ ...x, image_url: r.data.url })); setError('') } catch (err) { setError(errMsg(err)) }
  }

  const submit = async (e) => {
    e.preventDefault()
    const c = v.contact.trim()
    if (v.name.trim().length < 3) return setError('Product name must be at least 3 characters.')
    if (!(Number(v.price) > 0)) return setError('Enter a price greater than ₹0.')
    if (!v.category || !v.condition) return setError('Choose a category and condition.')
    if (c.replace(/\D/g, '').length < 10 && !/\S+@\S+\.\S+/.test(c)) return setError('Enter a 10-digit phone number (best for WhatsApp) or an email.')
    setBusy(true); setError('')
    try {
      const body = { ...v, price: Number(v.price) }
      const r = id ? await api.put(`/products/${id}`, body) : await api.post('/products', body)
      toast(id ? 'Changes saved' : 'Listing published')
      nav(`/product/${r.data.id}`)
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="mx-auto my-8 max-w-2xl space-y-4 rounded-2xl border border-navy/10 p-6">
      <h1 className="font-display text-2xl font-extrabold">{id ? 'Edit your listing' : 'Sell an item'}</h1>
      <Err m={error} />
      <Field label="Product name"><input className="input" value={v.name} onChange={set('name')} /></Field>
      <Field label="Description"><textarea className="input" rows="3" value={v.description} onChange={set('description')} placeholder="Age, usage, what's included" /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (₹)"><input className="input" type="number" min="1" value={v.price} onChange={set('price')} /></Field>
        <Field label="Category"><select className="input" value={v.category} onChange={set('category')}><option value="">Select</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        <Field label="Condition"><select className="input" value={v.condition} onChange={set('condition')}><option value="">Select</option>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></Field>
      </div>
      <Field label="WhatsApp number (or email)"><input className="input" value={v.contact} onChange={set('contact')} placeholder="98765 43210" /></Field>
      <p className="-mt-2 text-xs text-navy/60">Buyers get one-tap WhatsApp, call and copy buttons from this number.</p>
      <Field label="Photo (optional)">
        <div className="flex items-center gap-3"><Cover src={v.image_url} className="h-16 w-16 rounded-xl" />
          <label className="btn-ghost cursor-pointer"><ImagePlus size={16} />Choose image<input type="file" accept="image/*" className="hidden" onChange={pickImage} /></label></div>
      </Field>
      <button className="btn-navy w-full" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Publish listing'}</button>
    </form>
  )
}

export function MyListings() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const load = () => api.get('/my-products').then((r) => setItems(r.data)).catch((e) => setError(errMsg(e)))
  useEffect(() => { load() }, [])

  const toggle = (p) => api.patch(`/products/${p.id}/status`, { status: p.status === 'Sold' ? 'Available' : 'Sold' }).then(() => { load(); toast(p.status === 'Sold' ? 'Listing relisted' : 'Marked as sold') }).catch((e) => setError(errMsg(e)))
  const remove = (p) => window.confirm(`Delete “${p.name}”?`) && api.delete(`/products/${p.id}`).then(() => { load(); toast('Listing deleted') }).catch((e) => setError(errMsg(e)))

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between"><h1 className="font-display text-2xl font-extrabold">My listings</h1><Link to="/sell" className="btn-mint">Sell an item</Link></div>
      <Err m={error} />
      {items === null && !error && <p>Loading…</p>}
      {items?.length === 0 && <p className="rounded-2xl bg-mint-50 p-8 text-center">You haven’t listed anything yet. <Link className="font-bold underline" to="/sell">Sell your first item</Link>.</p>}
      {items?.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-navy/10 p-3">
          <Cover src={p.image_url} className="h-20 w-20 rounded-xl" />
          <div className="min-w-0 flex-1">
            <Link to={`/product/${p.id}`} className="font-display font-bold hover:underline">{p.name}</Link>
            <div className="mt-1 flex items-center gap-2"><span className="font-bold">{inr(p.price)}</span><Badge tone={p.status === 'Sold' ? 'sold' : 'mint'}>{p.status}</Badge></div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => toggle(p)}>{p.status === 'Sold' ? <><RotateCcw size={16} />Relist</> : <><CheckCircle2 size={16} />Mark sold</>}</button>
            <Link to={`/edit/${p.id}`} className="btn-ghost"><Pencil size={16} />Edit</Link>
            <button className="btn-ghost text-red-700" onClick={() => remove(p)}><Trash2 size={16} />Delete</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Saved() {
  const { ids } = useSaved()
  const [items, setItems] = useState(null)
  useEffect(() => {
    Promise.all(ids.map((id) => api.get(`/products/${id}`).then((r) => r.data).catch(() => null))).then((r) => setItems(r.filter(Boolean)))
  }, [ids.join(',')])
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <h1 className="font-display text-2xl font-extrabold">Saved items</h1>
      {items === null && ids.length > 0 && <p>Loading…</p>}
      {ids.length === 0 && <p className="rounded-2xl bg-mint-50 p-8 text-center">Tap the heart on any listing to keep it here. <Link className="font-bold underline" to="/">Browse the marketplace</Link>.</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items?.map((p) => <ProductCard key={p.id} p={p} />)}</div>
    </div>
  )
}
