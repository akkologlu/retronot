import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { ArrowRight, PenLine, ThumbsUp, CheckSquare, Users, Zap, Shield } from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 bg-[#0F172A]/80 backdrop-blur-md border-b border-white/5">
        <Logo size="sm" dark />
        <div className="hidden md:flex items-center gap-6">
          <a href="#features" className="text-sm text-white/50 hover:text-white transition-colors">Features</a>
          <a href="#how" className="text-sm text-white/50 hover:text-white transition-colors">How it works</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-400 text-amber-950 text-sm font-semibold hover:bg-amber-300 transition-colors"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-20 px-8 pb-16">
        <div className="mx-auto max-w-6xl w-full grid lg:grid-cols-2 gap-16 items-center">

          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="text-amber-300 text-xs font-medium">Real-time retrospectives</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
                Turn team feedback
                <br />
                <span className="text-amber-400">into action.</span>
              </h1>
              <p className="text-lg text-white/55 leading-relaxed max-w-md">
                RetroNot runs fast, focused retrospectives. Write, vote, and ship action items — all in under 30 minutes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-400 text-amber-950 font-semibold hover:bg-amber-300 transition-colors shadow-lg shadow-amber-400/20"
              >
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#how"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/70 text-sm font-medium hover:border-white/20 hover:text-white transition-colors"
              >
                How it works
              </a>
            </div>

            <div className="flex items-center gap-6 text-xs text-white/30 pt-2">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                No credit card required
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                Setup in 60 seconds
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Unlimited team members
              </div>
            </div>
          </div>

          {/* Right: App mockup */}
          <div className="hidden lg:block">
            <div
              className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40"
              style={{
                background: 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)',
              }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                  <div className="h-3 w-3 rounded-full bg-white/15" />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2">
                  <span className="text-xs text-white/30">Sprint 42 Retro</span>
                  <span className="text-white/15">·</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 text-xs font-semibold">Write</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {[0, 1, 2, 3].map(n => (
                      <div key={n} className="h-5 w-5 rounded-full bg-indigo-500/40 border border-[#0F172A]" />
                    ))}
                  </div>
                  <span className="text-white/30 text-xs ml-1">6</span>
                </div>
              </div>

              {/* Board content */}
              <div className="p-5 space-y-3">
                <div className="flex gap-3">
                  <div
                    className="flex-1 bg-amber-400 rounded-xl p-4 shadow-lg"
                    style={{ transform: 'rotate(-1deg)' }}
                  >
                    <p className="text-amber-950 text-sm font-semibold leading-snug">Shipped new API on time 🚀</p>
                  </div>
                  <div
                    className="flex-1 bg-amber-300 rounded-xl p-4 shadow-lg"
                    style={{ transform: 'rotate(1deg)' }}
                  >
                    <p className="text-amber-950 text-sm font-semibold leading-snug">Team communication was excellent</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="flex-1 bg-white/6 border border-white/10 rounded-xl p-4"
                    style={{ transform: 'rotate(0.5deg)' }}
                  >
                    <p className="text-white/50 text-sm font-medium leading-snug">CI pipeline kept breaking deploys</p>
                  </div>
                  <div
                    className="flex-1 bg-white/6 border border-white/10 rounded-xl p-4"
                    style={{ transform: 'rotate(-0.8deg)' }}
                  >
                    <p className="text-white/50 text-sm font-medium leading-snug">Sprint planning ran 30 min over</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div
                    className="flex-1 bg-indigo-500/10 border border-indigo-400/20 rounded-xl p-4"
                    style={{ transform: 'rotate(-0.3deg)' }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-1 h-2 w-2 rounded-full bg-indigo-400 shrink-0" />
                      <p className="text-indigo-200/70 text-sm font-medium leading-snug">Set up automated testing pipeline</p>
                    </div>
                  </div>
                  <div className="flex-1 bg-white/4 border border-white/8 rounded-xl p-4 flex flex-col justify-between">
                    <p className="text-white/35 text-sm font-medium leading-snug">Better code review process</p>
                    <div className="flex items-center gap-1.5 mt-3">
                      <div className="flex -space-x-1">
                        {[0, 1, 2].map(n => (
                          <div key={n} className="h-4 w-4 rounded-full bg-indigo-500/40 border border-[#1E293B]" />
                        ))}
                      </div>
                      <span className="text-white/25 text-xs">8 votes</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/8 text-xs text-white/20">
                  <span>14 notes · 23 votes</span>
                  <span>12:34 remaining</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-8 border-t border-white/5">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-3">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Features</p>
            <h2 className="text-4xl font-bold tracking-tight">Everything your team needs</h2>
            <p className="text-white/50 max-w-md mx-auto">No bloat. Just the tools that make retros actually useful.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: PenLine,
                title: 'Anonymous writing',
                desc: 'Team members write notes without seeing each other\'s input. Honest feedback, no groupthink.',
                color: 'text-amber-400',
                bg: 'bg-amber-400/10',
              },
              {
                icon: ThumbsUp,
                title: 'Dot voting',
                desc: 'Everyone votes on what matters most. Top priorities surface organically from the whole team.',
                color: 'text-indigo-400',
                bg: 'bg-indigo-400/10',
              },
              {
                icon: CheckSquare,
                title: 'Action items',
                desc: 'Every discussion ends with a named owner and deadline. No more retros that evaporate.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-400/10',
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {[
              {
                icon: Users,
                title: 'Real-time collaboration',
                desc: 'Every participant sees updates live. No refreshing, no waiting. Like a shared whiteboard.',
                color: 'text-rose-400',
                bg: 'bg-rose-400/10',
              },
              {
                icon: Zap,
                title: 'Structured phases',
                desc: 'Write → Group → Vote → Discuss. The flow keeps everyone on the same page every time.',
                color: 'text-yellow-400',
                bg: 'bg-yellow-400/10',
              },
              {
                icon: Shield,
                title: 'Templates',
                desc: 'Start from proven formats (Start/Stop/Continue, 4Ls, Mad/Sad/Glad) or build your own.',
                color: 'text-cyan-400',
                bg: 'bg-cyan-400/10',
              },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-white/8 bg-white/3 hover:bg-white/5 transition-colors"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-4`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="text-base font-semibold mb-2">{title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-8 border-t border-white/5">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-16 space-y-3">
            <p className="text-amber-400 text-sm font-semibold uppercase tracking-wider">Process</p>
            <h2 className="text-4xl font-bold tracking-tight">Four phases. Thirty minutes.</h2>
            <p className="text-white/50 max-w-md mx-auto">A proven structure that keeps retros tight and results real.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                phase: 'Write',
                duration: '5 min',
                desc: 'Everyone writes notes anonymously. No influence, no holding back.',
                color: 'bg-amber-400',
                textColor: 'text-amber-950',
              },
              {
                step: '02',
                phase: 'Group',
                duration: '5 min',
                desc: 'Cluster similar cards together to surface themes from the noise.',
                color: 'bg-indigo-500',
                textColor: 'text-white',
              },
              {
                step: '03',
                phase: 'Vote',
                duration: '5 min',
                desc: 'Each person votes on what matters most. Priorities emerge from the team.',
                color: 'bg-violet-500',
                textColor: 'text-white',
              },
              {
                step: '04',
                phase: 'Discuss',
                duration: '15 min',
                desc: 'Tackle top-voted items. End each topic with a concrete action item.',
                color: 'bg-emerald-500',
                textColor: 'text-white',
              },
            ].map(({ step, phase, duration, desc, color, textColor }) => (
              <div key={step} className="space-y-4">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <span className={`text-xs font-bold ${textColor}`}>{step}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold">{phase}</h3>
                    <span className="text-xs text-white/30">{duration}</span>
                  </div>
                  <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-8 border-t border-white/5">
        <div className="mx-auto max-w-2xl text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Ready to run your first retro?</h2>
            <p className="text-white/50 text-lg">Free. No credit card. Up and running in 60 seconds.</p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-amber-400 text-amber-950 font-bold text-lg hover:bg-amber-300 transition-colors shadow-xl shadow-amber-400/20"
          >
            Get started free <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-white/25">
            Trusted by engineering teams at startups and scale-ups.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-10">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size="sm" dark />
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/login" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/login" className="hover:text-white transition-colors">Templates</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <Link href="/kvkk" className="hover:text-white transition-colors">KVKK</Link>
          </div>
          <p className="text-xs text-white/20">© 2026 RetroNot. All rights reserved.</p>
        </div>
      </footer>

    </div>
  )
}
