import { Route, Routes } from 'react-router-dom'
import { Navbar } from './components'
import { Home, Login, Register, Details, ProductForm, MyListings, Saved, Protected } from './pages'

export default function App() {
  return (
    <>
      <Navbar />
      <main className="min-h-[80vh]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/product/:id" element={<Details />} />
          <Route path="/sell" element={<Protected><ProductForm /></Protected>} />
          <Route path="/edit/:id" element={<Protected><ProductForm /></Protected>} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/my-listings" element={<Protected><MyListings /></Protected>} />
          <Route path="*" element={<p className="p-10 text-center">Page not found.</p>} />
        </Routes>
      </main>
      <footer className="border-t border-navy/10 bg-navy-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm md:grid-cols-3">
          <div><p className="font-display text-lg font-extrabold">SMIT Market</p><p className="mt-1 text-navy/70">Second-hand buying and selling, made by students for students.</p></div>
          <div><p className="font-bold">Quick links</p><ul className="mt-1 space-y-1 text-navy/70"><li><a href="/">Marketplace</a></li><li><a href="/sell">Sell an item</a></li><li><a href="/saved">Saved items</a></li></ul></div>
          <div><p className="font-bold">Stay safe</p><ul className="mt-1 list-disc space-y-1 pl-4 text-navy/70"><li>Meet in public spots on campus</li><li>Check the item before you pay</li><li>Never share OTPs or passwords</li></ul></div>
        </div>
      </footer>
    </>
  )
}
