import Link from 'next/link'
import { Logo } from '@/components/layout/logo'
import { ArrowLeft } from 'lucide-react'

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-8 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Logo size="sm" />
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main id="main-content" className="mx-auto max-w-4xl px-8 py-16">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Cookie Policy</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 28, 2026</p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-foreground/90 leading-relaxed">
          {/* 1 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when you visit a website.
              They are widely used to make websites work efficiently, provide a better user
              experience, and supply information to the site operators.
            </p>
            <p>
              RetroNot uses cookies and similar technologies (such as local storage) to authenticate
              users, remember preferences, and understand how the Service is used. This Cookie Policy
              explains what cookies we use, why we use them, and how you can manage them.
            </p>
          </section>

          {/* 2 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Cookies We Use</h2>
            <p>
              The following table describes the cookies and local storage items used by RetroNot:
            </p>

            <h3 className="text-lg font-medium text-foreground mt-6">2.1 Essential Cookies</h3>
            <p className="text-foreground/80">
              These cookies are strictly necessary for the Service to function. They cannot be
              disabled without breaking core functionality.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Provider</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token</td>
                    <td className="px-4 py-3">Supabase</td>
                    <td className="px-4 py-3">Stores your authentication session token so you remain signed in</td>
                    <td className="px-4 py-3">7 days</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                    <td className="px-4 py-3">Supabase</td>
                    <td className="px-4 py-3">PKCE code verifier for secure OAuth flows</td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">retronot-cookie-consent</td>
                    <td className="px-4 py-3">RetroNot</td>
                    <td className="px-4 py-3">Stores your cookie consent preferences (local storage)</td>
                    <td className="px-4 py-3">Persistent</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-foreground mt-6">2.2 Functional Cookies</h3>
            <p className="text-foreground/80">
              These cookies enable enhanced functionality and personalization. The Service can
              function without them, but some features may not work as expected.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Provider</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">theme</td>
                    <td className="px-4 py-3">next-themes</td>
                    <td className="px-4 py-3">Remembers your preferred color theme (light, dark, or system)</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">retro-store-*</td>
                    <td className="px-4 py-3">RetroNot</td>
                    <td className="px-4 py-3">Persists UI state for retrospective sessions (local storage)</td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-foreground mt-6">2.3 Analytics Cookies</h3>
            <p className="text-foreground/80">
              These cookies help us understand how visitors interact with the Service so we can
              improve it. All analytics data is anonymized.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Provider</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Purpose</th>
                    <th className="text-left px-4 py-3 font-medium text-foreground border-b border-border">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">sentry-*</td>
                    <td className="px-4 py-3">Sentry</td>
                    <td className="px-4 py-3">Error tracking and performance monitoring — captures anonymized session replay and error context</td>
                    <td className="px-4 py-3">90 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 3 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Third-Party Cookies</h2>
            <p>
              Some cookies are set by third-party services that appear on our pages. We do not
              control these cookies. The third-party providers and their purposes are:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Supabase</strong> — Authentication and session management. Cookies are set
                by Supabase&apos;s authentication service to maintain your login session securely.
              </li>
              <li>
                <strong>Sentry</strong> — Error monitoring. Sentry may store identifiers to
                correlate error reports across sessions. No personally identifiable information is
                intentionally collected.
              </li>
              <li>
                <strong>Vercel</strong> — Hosting platform. Vercel may set performance-related
                cookies for edge caching and request routing.
              </li>
            </ul>
            <p>
              We do not use any advertising or social media tracking cookies.
            </p>
          </section>

          {/* 4 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Your Cookie Choices</h2>
            <p>
              When you first visit RetroNot, a cookie consent banner is displayed. You can choose to:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>
                <strong>Accept All:</strong> Enables all cookie categories (essential, functional,
                and analytics).
              </li>
              <li>
                <strong>Essentials Only:</strong> Enables only cookies that are strictly necessary
                for the Service to function. Functional and analytics cookies will not be set.
              </li>
            </ul>
            <p>
              You can change your cookie preferences at any time by clearing your browser&apos;s
              local storage for <span className="font-medium text-foreground">retronot.app</span>{' '}
              and refreshing the page. The consent banner will reappear.
            </p>
          </section>

          {/* 5 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Managing Cookies in Your Browser</h2>
            <p>
              Most web browsers allow you to control cookies through their settings. You can
              typically:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li>View and delete existing cookies</li>
              <li>Block all cookies or only third-party cookies</li>
              <li>Set preferences for specific websites</li>
              <li>Enable notifications when cookies are set</li>
            </ul>
            <p>
              Please note that disabling essential cookies will prevent you from signing in and
              using RetroNot. Below are links to cookie management instructions for common browsers:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-foreground/80">
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and Site Permissions → Cookies</li>
            </ul>
          </section>

          {/* 6 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Local Storage</h2>
            <p>
              In addition to cookies, RetroNot uses browser local storage to persist certain
              preferences and state on your device. Local storage functions similarly to cookies but
              can store larger amounts of data and does not expire automatically.
            </p>
            <p>
              Local storage items used by RetroNot include your cookie consent preferences, theme
              selection, and temporary retrospective session state. You can clear local storage
              through your browser&apos;s developer tools or site data settings.
            </p>
          </section>

          {/* 7 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our practices
              or for operational, legal, or regulatory reasons. When we make changes, we will update
              the &quot;Last updated&quot; date at the top of this page.
            </p>
            <p>
              If we make significant changes to how we use cookies, we will reset cookie consent
              preferences so you can review and accept the updated policy.
            </p>
          </section>

          {/* 8 */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>
              If you have any questions about our use of cookies, please contact us at:
            </p>
            <p className="font-medium text-foreground">
              privacy@retronot.app
            </p>
            <p>
              For more information about how we handle your personal data, please read our{' '}
              <Link
                href="/privacy"
                className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
              >
                Privacy Policy
              </Link>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="mx-auto max-w-4xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="/cookie-policy" className="text-foreground font-medium">Cookie Policy</Link>
            <Link href="/kvkk" className="hover:text-foreground transition-colors">KVKK</Link>
          </div>
          <p className="text-xs text-muted-foreground/60">© 2026 RetroNot. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
