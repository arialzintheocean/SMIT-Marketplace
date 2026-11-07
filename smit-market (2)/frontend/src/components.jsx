import { useState } from 'react'
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, LogOut, Package, MessageCircle, Phone, Mail, Copy, Check, Heart } from 'lucide-react'
import { useAuth } from './auth'
import { inr } from './api'
import { useSaved } from './ui'

export function Navbar() {
  const { user, signOut } = useAuth()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') || '')
  const link = ({ isActive }) => `text-sm font-bold ${isActive ? 'text-mint-600' : 'text-navy hover:text-mint-600'}`

  const search = (e) => { e.preventDefault(); nav(q.trim() ? `/?q=${encodeURIComponent(q.trim())}` : '/') }

  return (
    <header className="sticky top-0 z-20 border-b border-navy/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          SMIT <span className="rounded-lg bg-mint px-1.5 py-0.5">Market</span>
        </Link>
        <form onSubmit={search} className="order-3 flex w-full gap-2 md:order-none md:w-auto md:flex-1">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-navy/50" />
            <input className="input pl-9" placeholder="Search books, cycles, lamps…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-navy">Search</button>
        </form>
        <nav className="ml-auto flex items-center gap-4">
          <NavLink to="/" end className={link}>Marketplace</NavLink>
          <NavLink to="/saved" className={link}>Saved</NavLink>
          {user && <NavLink to="/my-listings" className={link}>My Listings</NavLink>}
          {user ? (
            <>
              <Link to="/sell" className="btn-mint"><Plus size={16} />Sell</Link>
              <button onClick={() => { signOut(); nav('/') }} className="btn-ghost" title={user.name}><LogOut size={16} />Log out</button>
            </>
          ) : (
            <Link to="/login" className="btn-navy">Log in</Link>
          )}
        </nav>
      </div>
    </header>
  )
}

export function Cover({ src, className = '' }) {
  return src
    ? <img src={src} alt="" className={`object-cover ${className}`} />
    : <div className={`flex items-center justify-center bg-mint-50 text-mint-600 ${className}`}><Package size={40} /></div>
}

export function Badge({ children, tone = 'navy' }) {
  const t = { navy: 'bg-navy-50 text-navy', mint: 'bg-mint-100 text-navy', sold: 'bg-navy text-white' }[tone]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${t}`}>{children}</span>
}

export function ProductCard({ p }) {
  const { has, toggle } = useSaved()
  const isNew = Date.now() - new Date(p.created_at).getTime() < 48 * 3600 * 1000
  return (
    <Link to={`/product/${p.id}`} className="group overflow-hidden rounded-2xl border border-navy/10 bg-white transition hover:border-mint-600">
      <div className="relative">
        <Cover src={p.image_url} className="h-44 w-full" />
        {isNew && <span className="absolute left-3 top-3 rounded-full bg-mint px-2.5 py-0.5 text-xs font-bold">New</span>}
        <button aria-label={has(p.id) ? 'Remove from saved' : 'Save item'} onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(p.id) }} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow hover:bg-white">
          <Heart size={16} className={has(p.id) ? 'fill-red-500 text-red-500' : 'text-navy'} />
        </button>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 font-display font-bold leading-snug">{p.name}</h3>
          <span className="whitespace-nowrap font-display text-lg font-extrabold">{inr(p.price)}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="mint">{p.category}</Badge><Badge>{p.condition}</Badge>
          {p.is_demo && <Badge>Demo</Badge>}
        </div>
        <p className="text-sm text-navy/70">Sold by {p.seller_name}</p>
        <span className="btn-mint w-full"><MessageCircle size={16} />Contact seller</span>
      </div>
    </Link>
  )
}

// One-tap ways to reach the seller: WhatsApp (message pre-filled), call, email, copy.
export function ContactButtons({ p }) {
  const [copied, setCopied] = useState(false)
  const contact = p.contact.trim()
  const digits = contact.replace(/\D/g, '')
  const phone = digits.length >= 10 ? digits.slice(-10) : ''
  const email = /\S+@\S+\.\S+/.test(contact) ? contact : ''
  const msg = `Hi ${p.seller_name}, I saw "${p.name}" (${inr(p.price)}) on SMIT Market. Is it still available? When and where can we meet on campus?`

  const copy = async () => {
    try { await navigator.clipboard.writeText(contact); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { window.prompt('Copy this contact:', contact) }
  }

  if (p.status === 'Sold') return <p className="rounded-xl bg-navy-50 p-3 text-sm font-bold">This item has been sold.</p>
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {phone && <a className="btn-mint" target="_blank" rel="noreferrer" href={`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`}><MessageCircle size={16} />Chat on WhatsApp</a>}
        {phone && <a className="btn-navy" href={`tel:+91${phone}`}><Phone size={16} />Call seller</a>}
        {email && <a className="btn-navy" href={`mailto:${email}?subject=${encodeURIComponent(`Interested in ${p.name}`)}&body=${encodeURIComponent(msg)}`}><Mail size={16} />Email seller</a>}
        <button className="btn-ghost" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : `Copy ${phone ? 'number' : 'email'}`}</button>
      </div>
      <p className="text-xs text-navy/60">WhatsApp opens with a ready-made message about this item, so you only need to tap send. Meet in a public spot on campus and check the item before you pay.</p>
    </div>
  )
}
