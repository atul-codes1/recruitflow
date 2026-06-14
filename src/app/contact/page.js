import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';

/**
 * Contact Us Page (Server Component)
 * 
 * Route: `/contact`
 * 
 * Static marketing page with a contact form. 
 * Note: The form submission is currently a UI mock and needs wiring 
 * to an email service (e.g., Resend, SendGrid) in the future.
 */
export default function ContactPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-surface-950)' }}>
      <PublicHeader />
      <main style={{ flex: 1, maxWidth: '600px', margin: '4rem auto', padding: '0 2rem', width: '100%' }}>
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: 'var(--color-surface-100)', marginBottom: '1rem', fontFamily: 'var(--font-outfit, var(--font-display))', textAlign: 'center' }}>
          Contact Us
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '1.125rem', marginBottom: '3rem', textAlign: 'center' }}>
          Have a question or want to upgrade your plan? We'd love to hear from you.
        </p>

        <form className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label">First Name</label>
              <input type="text" className="input" placeholder="Jane" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label className="label">Last Name</label>
              <input type="text" className="input" placeholder="Doe" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label">Work Email</label>
            <input type="email" className="input" placeholder="jane@company.com" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="label">Message</label>
            <textarea className="input" rows="5" placeholder="How can we help?"></textarea>
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: '1rem', justifyContent: 'center' }}>
            Send Message
          </button>
        </form>
      </main>
      <PublicFooter />
    </div>
  );
}
