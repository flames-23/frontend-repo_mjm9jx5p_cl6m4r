import { useEffect, useMemo, useState } from 'react'
import Spline from '@splinetool/react-spline'

function useBackendBase() {
  return useMemo(() => {
    const env = import.meta.env.VITE_BACKEND_URL
    if (env) return env.replace(/\/$/, '')
    try {
      const url = new URL(window.location.href)
      // Replace port 3000 with 8000 if present
      if (url.port === '3000') {
        url.port = '8000'
        return url.origin
      }
    } catch {}
    return 'http://localhost:8000'
  }, [])
}

function Hero() {
  return (
    <section className="relative w-full h-[60vh] md:h-[70vh] lg:h-[80vh] bg-[#0b0f1a] overflow-hidden">
      <div className="absolute inset-0">
        <Spline scene="https://prod.spline.design/2fSS9b44gtYBt4RI/scene.splinecode" style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="relative z-10 max-w-6xl mx-auto px-6 h-full flex items-center">
        <div className="text-white max-w-xl">
          <span className="inline-block text-xs tracking-widest uppercase text-cyan-300/80 mb-3">Smart Healthcare</span>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight">Book lab tests, chat with Laura, and access reports securely</h1>
          <p className="mt-4 text-cyan-100/80">AI assistant Laura suggests tests from your symptoms, books appointments, applies promos, and verifies your identity before showing reports.</p>
          <div className="mt-6 flex items-center gap-3">
            <a href="#chat" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-5 py-2.5 rounded-md transition">Ask Laura</a>
            <a href="#dashboard" className="border border-cyan-400/40 text-cyan-200 hover:bg-white/10 px-5 py-2.5 rounded-md transition">Open Dashboard</a>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0b0f1a] via-transparent to-transparent" />
    </section>
  )
}

function Chat({ base, userId }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I am Laura. Tell me how you’re feeling or say "Book CBC tomorrow 10am".' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, text })
      })
      const data = await res.json()
      if (data.message) setMessages((m) => [...m, { role: 'assistant', text: data.message }])
      if (data.type === 'suggestions' && data.tests) {
        setMessages((m) => [...m, { role: 'assistant', text: 'Suggested tests: ' + data.tests.map(t => `${t.name || t.code} (${t.code})`).join(', ') }])
      }
      if (data.type === 'action_required' && data.action === 'verify_pin') {
        setMessages((m) => [...m, { role: 'assistant', text: 'To view a report, enter booking ID and your 4-digit PIN below.' }])
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Sorry, something went wrong.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="chat" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b">Chat with Laura</div>
      <div className="p-5 space-y-3 max-h-72 overflow-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span className={`inline-block px-3 py-2 rounded-lg ${m.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-100 text-gray-800'}`}>{m.text}</span>
          </div>
        ))}
        {loading && <div className="text-sm text-gray-500">Laura is typing…</div>}
      </div>
      <form onSubmit={send} className="flex gap-2 p-4 border-t">
        <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Type a message..." className="flex-1 border rounded-md px-3 py-2 outline-none focus:ring-2 ring-cyan-300" />
        <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-md">Send</button>
      </form>
      <ReportViewer base={base} />
    </div>
  )
}

function ReportViewer({ base }) {
  const [bookingId, setBookingId] = useState('')
  const [pin, setPin] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const view = async (e) => {
    e.preventDefault()
    setError('')
    setResult(null)
    try {
      const res = await fetch(`${base}/api/reports/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, pin })
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed')
      const data = await res.json()
      setResult(data.report)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="p-4 border-t bg-gray-50">
      <div className="text-sm text-gray-700 mb-2">Secure report access</div>
      <form onSubmit={view} className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <input value={bookingId} onChange={(e)=>setBookingId(e.target.value)} placeholder="Booking ID" className="border rounded px-3 py-2" />
        <input value={pin} onChange={(e)=>setPin(e.target.value)} placeholder="4-digit PIN" className="border rounded px-3 py-2" />
        <button className="bg-gray-900 text-white rounded px-4 py-2">View Report</button>
      </form>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {result && (
        <div className="mt-3 text-sm">
          <div className="font-medium">Report Summary</div>
          <pre className="text-xs bg-white border rounded p-3 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}

function Tests({ base, onBook }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await fetch(`${base}/api/tests`)
      const data = await res.json()
      setItems(data.items || [])
      setLoading(false)
    })()
  }, [base])

  if (loading) return <div className="p-4">Loading tests…</div>

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((t, i) => (
        <div key={i} className="border rounded-lg p-4 bg-white shadow-sm">
          <div className="font-semibold">{t.name} <span className="text-xs text-gray-500">({t.code})</span></div>
          <div className="text-sm text-gray-600 mt-1">{t.category}</div>
          <div className="text-sm text-gray-500 mt-2">{t.preparation}</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="font-bold">${t.price}</div>
            <button onClick={()=>onBook(t)} className="text-sm bg-cyan-600 text-white px-3 py-1.5 rounded">Book</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Bookings({ base, userId }) {
  const [items, setItems] = useState([])
  const load = async () => {
    const res = await fetch(`${base}/api/bookings?user_id=${encodeURIComponent(userId)}`)
    const data = await res.json()
    setItems(data.items || [])
  }
  useEffect(() => { load() }, [])

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <div className="font-semibold mb-3">Your Appointments</div>
      <div className="space-y-3">
        {items.length === 0 && <div className="text-sm text-gray-500">No bookings yet.</div>}
        {items.map((b, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border rounded p-3">
            <div className="text-sm">
              <div className="font-medium">{b.test_code}</div>
              <div className="text-gray-600">{new Date(b.scheduled_at).toLocaleString()}</div>
            </div>
            <div className="text-sm mt-2 sm:mt-0">Status: <span className="font-medium">{b.status}</span></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PromoTester({ base, price }) {
  const [code, setCode] = useState('NEWUSER10')
  const [out, setOut] = useState(null)
  const apply = async () => {
    const res = await fetch(`${base}/api/promos/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, price })
    })
    setOut(await res.json())
  }
  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <div className="font-semibold mb-2">Promo Codes</div>
      <div className="flex gap-2">
        <input value={code} onChange={(e)=>setCode(e.target.value)} className="border rounded px-3 py-2" />
        <button onClick={apply} className="bg-gray-900 text-white rounded px-4">Apply</button>
      </div>
      {out && <div className="text-sm text-gray-700 mt-2">Discount: ${out.discount} • Total: ${out.total} — {out.message}</div>}
    </div>
  )
}

function App() {
  const base = useBackendBase()
  const userId = 'demo-user-1'
  const [selectedTest, setSelectedTest] = useState(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [address, setAddress] = useState('')
  const [activeTab, setActiveTab] = useState('chat')

  const bookNow = async () => {
    if (!selectedTest || !scheduledAt) return
    const res = await fetch(`${base}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, test_code: selectedTest.code, scheduled_at: scheduledAt, address })
    })
    const data = await res.json()
    if (res.ok) {
      alert('Booking confirmed! ID: ' + data.id)
      setSelectedTest(null)
      setScheduledAt('')
      setAddress('')
    } else {
      alert(data.detail || 'Failed to book')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-cyan-50 text-gray-900">
      <Hero />
      <main id="dashboard" className="max-w-6xl mx-auto px-6 -mt-16 relative z-10">
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl p-4 border">
          <div className="flex gap-2 mb-4">
            <button onClick={()=>setActiveTab('chat')} className={`px-4 py-2 rounded-md ${activeTab==='chat'?'bg-cyan-600 text-white':'bg-gray-100'}`}>Chat</button>
            <button onClick={()=>setActiveTab('tests')} className={`px-4 py-2 rounded-md ${activeTab==='tests'?'bg-cyan-600 text-white':'bg-gray-100'}`}>Tests</button>
            <button onClick={()=>setActiveTab('bookings')} className={`px-4 py-2 rounded-md ${activeTab==='bookings'?'bg-cyan-600 text-white':'bg-gray-100'}`}>Bookings</button>
          </div>
          {activeTab === 'chat' && <Chat base={base} userId={userId} />}
          {activeTab === 'tests' && (
            <div className="space-y-4">
              <Tests base={base} onBook={setSelectedTest} />
              <PromoTester base={base} price={selectedTest?.price || 50} />
            </div>
          )}
          {activeTab === 'bookings' && <Bookings base={base} userId={userId} />}
        </div>

        {selectedTest && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-5 shadow-lg">
              <div className="font-semibold text-lg">Book {selectedTest.name} ({selectedTest.code})</div>
              <div className="mt-3 space-y-3">
                <label className="block text-sm">Date & Time</label>
                <input type="datetime-local" value={scheduledAt} onChange={(e)=>setScheduledAt(e.target.value)} className="w-full border rounded px-3 py-2" />
                <label className="block text-sm">Address (optional)</label>
                <input value={address} onChange={(e)=>setAddress(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Home sample pickup address" />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={()=>setSelectedTest(null)} className="px-4 py-2 rounded bg-gray-100">Cancel</button>
                <button onClick={bookNow} className="px-4 py-2 rounded bg-cyan-600 text-white">Confirm</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-10 text-sm text-gray-600">
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <div className="font-semibold">Meet Our Lab Experts</div>
            <p className="mt-2">Accredited professionals with experience in hematology, biochemistry, and microbiology.</p>
          </div>
          <div>
            <div className="font-semibold">How It Works</div>
            <ol className="mt-2 list-decimal list-inside space-y-1">
              <li>Book your test</li>
              <li>Sample collection at your doorstep</li>
              <li>Get digital reports</li>
            </ol>
          </div>
          <div>
            <div className="font-semibold">Trust & Certifications</div>
            <p className="mt-2">ISO compliant processes. Secure, PIN-protected report access. 2FA-ready.</p>
          </div>
        </div>
        <div className="mt-6">© {new Date().getFullYear()} HealthLab</div>
      </footer>
    </div>
  )
}

export default App
