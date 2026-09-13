import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Code2, HeartHandshake, ShieldCheck, Users } from 'lucide-react'

const PRINCIPLES = [
  { icon: HeartHandshake, title: 'Useful over impressive', text: 'Every surface should help a team make a better testing decision.' },
  { icon: ShieldCheck, title: 'Context is coverage', text: 'A result matters more when the case, owner, and note behind it stay close.' },
  { icon: Code2, title: 'Open by default', text: 'Self-host QAlibrate, keep your data close, and make it fit your workflow.' },
]

export default function About() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line/80 bg-paper/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5"><span className="flex h-9 w-9 items-center justify-center rounded bg-signal"><ClipboardCheck size={19} className="text-white" /></span><span className="text-[15px] font-extrabold tracking-tight">QAlibrate</span></Link>
          <Link to="/" className="btn-ghost"><ArrowLeft size={15} /> Back home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-3xl animate-rise">
          <p className="th-label text-signal">About QAlibrate</p>
          <h1 className="mt-5 text-5xl font-extrabold leading-[0.98] tracking-[-0.04em] text-ink sm:text-7xl">Good software deserves a clear quality story.</h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-ink-muted">QAlibrate is a lightweight, self-hosted test case manager for teams who want the discipline of a real QA practice without the weight of an enterprise maze.</p>
        </div>
        <div className="mt-20 grid gap-10 border-y border-line py-12 md:grid-cols-[0.8fr_1.2fr] md:py-16">
          <div><p className="th-label">Our point of view</p><div className="mt-5 flex items-center gap-3 text-sm font-bold text-ink"><Users size={18} className="text-signal" /> Built around the people doing the work</div></div>
          <div className="space-y-5 text-base leading-7 text-ink-muted"><p>Testing is not a checkbox at the end of a release. It is a conversation between what a team intended, what the product did, and what should happen next.</p><p>QAlibrate keeps that conversation practical: structured cases, focused runs, honest outcomes, and analytics that point to the next useful question.</p></div>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, text }) => <div key={title} className="border-t-2 border-line pt-5 hover:border-signal"><Icon size={21} className="text-signal" /><h2 className="mt-6 text-base font-extrabold">{title}</h2><p className="mt-2 text-sm leading-6 text-ink-muted">{text}</p></div>)}
        </div>
        <div className="mt-20 flex flex-col items-start justify-between gap-6 rounded-lg bg-ink px-7 py-8 text-white sm:flex-row sm:items-center sm:px-10"><div><p className="text-lg font-extrabold">Ready to make quality visible?</p><p className="mt-1 text-sm text-white/55">Set up your first workspace and start with the work that matters.</p></div><Link to="/register" className="btn-secondary border-white/20 bg-white text-ink hover:border-white">Create an account <ArrowLeft size={15} className="rotate-180" /></Link></div>
      </main>
    </div>
  )
}
