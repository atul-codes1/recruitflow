import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, companies(id, name, domain)')
    .eq('id', user.id)
    .single();

  const company = profile?.companies;

  return (
    <div className="animate-fade" style={{ paddingBottom: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          fontFamily: 'var(--font-outfit, var(--font-display))', 
          color: 'var(--color-surface-100)',
          marginBottom: '0.25rem',
          letterSpacing: '-0.03em'
        }}>
          My Profile
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '1.05rem', margin: 0, lineHeight: 1.5 }}>
          Manage your personal account details and copy your Recruiter Agent ID.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        
        {/* PERSONAL INFO CARD */}
        <div className="card" style={{
          padding: '2rem',
          background: 'var(--bg-panel)',
          borderRadius: '16px',
          border: '1px solid var(--border-light)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', margin: 0, fontFamily: 'var(--font-outfit, var(--font-display))', borderBottom: '1px solid var(--border-light)', paddingBottom: '1rem' }}>
            Account Information
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-surface-400)', marginBottom: '0.25rem', fontWeight: 500 }}>Full Name</label>
              <div style={{ color: 'var(--color-surface-100)', fontSize: '1.1rem', fontWeight: 500 }}>{profile?.full_name || 'N/A'}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-surface-400)', marginBottom: '0.25rem', fontWeight: 500 }}>Email Address</label>
              <div style={{ color: 'var(--color-surface-100)', fontSize: '1.1rem', fontWeight: 500 }}>{user?.email || 'N/A'}</div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-surface-400)', marginBottom: '0.25rem', fontWeight: 500 }}>Organization Role</label>
              <div style={{ display: 'inline-block', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '0.3rem 0.8rem', borderRadius: '99px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(99, 102, 241, 0.3)', textTransform: 'capitalize' }}>
                {profile?.role || 'Member'}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-surface-400)', marginBottom: '0.25rem', fontWeight: 500 }}>Organization Name</label>
              <div style={{ color: 'var(--color-surface-100)', fontSize: '1.1rem', fontWeight: 500 }}>{company?.name || company?.domain || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* AGENT ID CARD */}
        <div className="card" style={{
          position: 'relative',
          padding: '2rem',
          background: 'linear-gradient(145deg, rgba(99, 102, 241, 0.1) 0%, var(--bg-panel) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 8px 32px rgba(99, 102, 241, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
              <span style={{ fontSize: '1.5rem' }}>🔑</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', margin: '0 0 0.25rem 0', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
                Recruiter Agent ID
              </h3>
              <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9rem', margin: 0, lineHeight: 1.4 }}>
                This is your organization's secure identifier. Copy this ID and paste it into the <b>RecruitFlow Desktop Sync App</b> to link your local folders directly to this workspace.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <input 
              type="text" 
              readOnly 
              value={company?.id || ''} 
              style={{ 
                flex: 1, 
                background: 'var(--bg-input)', 
                border: '1px solid var(--border-light)', 
                padding: '0.8rem 1rem', 
                borderRadius: '8px', 
                color: 'var(--color-surface-100)', 
                fontSize: '1rem', 
                fontFamily: 'monospace',
                fontWeight: 600,
                outline: 'none',
              }} 
            />
          </div>
        </div>

      </div>
    </div>
  );
}
