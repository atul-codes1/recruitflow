import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }) {
  const { domain } = await params;
  
  const supabaseAdmin = createAdminClient();
  const { data: company, error } = await supabaseAdmin
    .from('companies')
    .select('id, storage_provider, storage_config')
    .eq('domain', domain)
    .single();

  if (error || !company) {
    return <div>Error loading settings. Ensure this company exists.</div>;
  }

  const activeProvider = company.storage_provider; // 'onedrive', 'gdrive', 'zoho', or null

  async function saveZohoFolder(formData) {
    "use server";
    const folderId = formData.get('folderId');
    if (!folderId) return;
    
    const admin = createAdminClient();
    const { data: comp } = await admin.from('companies').select('storage_config').eq('id', company.id).single();
    const newConfig = { ...(comp?.storage_config || {}), folderId };
    await admin.from('companies').update({ storage_config: newConfig }).eq('id', company.id);
    revalidatePath(`/${domain}/dashboard/settings`);
  }

  async function disconnectStorage() {
    "use server";
    const admin = createAdminClient();
    await admin.from('companies').update({ storage_provider: null, storage_config: {} }).eq('id', company.id);
    revalidatePath(`/${domain}/dashboard/settings`);
  }

  return (
    <div className="animate-fade" style={{ paddingBottom: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '2.5rem', 
          fontWeight: 800, 
          fontFamily: 'var(--font-outfit, var(--font-display))', 
          color: 'var(--color-surface-100)',
          marginBottom: '0.75rem',
          letterSpacing: '-0.03em'
        }}>
          Integrations Hub
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '1.05rem', maxWidth: '500px', margin: '0 auto', lineHeight: 1.5 }}>
          Connect your corporate cloud storage to automate resume syncing across your entire organization.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        
        {/* MICROSOFT ONEDRIVE CARD */}
        <div className="card" style={{
          position: 'relative',
          padding: '1.75rem',
          background: 'var(--bg-panel)',
          borderRadius: '16px',
          border: `1px solid ${activeProvider === 'onedrive' ? '#0078D4' : 'var(--border-light)'}`,
          boxShadow: activeProvider === 'onedrive' ? '0 8px 32px rgba(0, 120, 212, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12.9 8.24A4.33 4.33 0 0 0 4.6 10a5 5 0 0 0 .58 9.94h11.23a6 6 0 0 0 1.54-11.8 3.86 3.86 0 0 0-5.05-3.9Z" fill="#0078D4"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', margin: '0 0 0.35rem 0', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
                  Microsoft OneDrive
                </h3>
                <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9rem', margin: 0, lineHeight: 1.4, maxWidth: '400px' }}>
                  Zero-touch automation. Seamlessly syncs candidate resumes to a dedicated RecruitFlow folder in your M365 Drive.
                </p>
              </div>
            </div>
            <div>
              {activeProvider === 'onedrive' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Connected
                  </div>
                  <form action={disconnectStorage}>
                    <button type="submit" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <a href={`/api/auth/integrations/onedrive/connect?company_id=${company.id}&domain=${domain}`} style={{ textDecoration: 'none' }}>
                  <button style={{ background: '#0078D4', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Connect Microsoft
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* GOOGLE DRIVE CARD */}
        <div className="card" style={{
          position: 'relative',
          padding: '1.75rem',
          background: 'var(--bg-panel)',
          borderRadius: '16px',
          border: `1px solid ${activeProvider === 'gdrive' ? '#10b981' : 'var(--border-light)'}`,
          boxShadow: activeProvider === 'gdrive' ? '0 8px 32px rgba(16, 185, 129, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15.4 7.5L8.6 19.3H1.8L8.6 7.5H15.4Z" fill="#FFC107"/>
                  <path d="M12 1.6L5.2 13.4L1.8 7.5L8.6 1.6H12Z" fill="#1976D2"/>
                  <path d="M22.2 13.4L15.4 1.6H8.6L15.4 13.4H22.2Z" fill="#4CAF50"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', margin: '0 0 0.35rem 0', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
                  Google Drive
                </h3>
                <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9rem', margin: 0, lineHeight: 1.4, maxWidth: '400px' }}>
                  Secure, zero-touch syncing. We automatically create and manage a dedicated resumes folder in your Google Workspace.
                </p>
              </div>
            </div>
            <div>
              {activeProvider === 'gdrive' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Connected
                  </div>
                  <form action={disconnectStorage}>
                    <button type="submit" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <a href={`/api/auth/integrations/gdrive/connect?company_id=${company.id}&domain=${domain}`} style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Connect Google
                  </button>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ZOHO WORKDRIVE CARD */}
        <div className="card" style={{
          position: 'relative',
          padding: '1.75rem',
          background: 'var(--bg-panel)',
          borderRadius: '16px',
          border: `1px solid ${activeProvider === 'zoho' ? '#ef4444' : 'var(--border-light)'}`,
          boxShadow: activeProvider === 'zoho' ? '0 8px 32px rgba(239, 68, 68, 0.15)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-light)' }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="20" height="16" rx="3" fill="#ef4444"/>
                  <path d="M7 9H17L7 15H17" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-surface-100)', margin: '0 0 0.35rem 0', fontFamily: 'var(--font-outfit, var(--font-display))' }}>
                  Zoho WorkDrive
                </h3>
                <p style={{ color: 'var(--color-surface-400)', fontSize: '0.9rem', margin: 0, lineHeight: 1.4, maxWidth: '400px' }}>
                  Enterprise integration for Zoho ecosystems. Requires manual Team Workspace configuration.
                </p>
              </div>
            </div>
            <div>
              {activeProvider === 'zoho' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.5rem 1rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Connected
                  </div>
                  <form action={disconnectStorage}>
                    <button type="submit" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                      Disconnect
                    </button>
                  </form>
                </div>
              ) : (
                <a href={`/api/auth/integrations/zoho/connect?company_id=${company.id}&domain=${domain}`} style={{ textDecoration: 'none' }}>
                  <button className="btn-secondary" style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>
                    Connect Zoho
                  </button>
                </a>
              )}
            </div>
          </div>
          
          {activeProvider === 'zoho' && (
            <div className="animate-fade" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
               <h4 style={{ color: 'var(--color-surface-100)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', marginTop: 0 }}>Team Workspace Configuration</h4>
               <form action={saveZohoFolder} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                 <div style={{ flex: 1, position: 'relative' }}>
                   <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-surface-400)' }}>
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                   </div>
                   <input 
                     type="text" 
                     name="folderId" 
                     placeholder="Paste your WorkDrive Folder ID..." 
                     defaultValue={company.storage_config?.folderId || ''} 
                     style={{ 
                       width: '100%', 
                       background: 'var(--bg-input)', 
                       border: '1px solid var(--border-light)', 
                       padding: '0.75rem 1rem 0.75rem 2.5rem', 
                       borderRadius: '8px', 
                       color: 'var(--color-surface-100)', 
                       fontSize: '0.9rem', 
                       outline: 'none',
                       boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                       transition: 'border 0.2s'
                     }} 
                     required 
                   />
                 </div>
                 <button type="submit" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}>
                   Save Config
                 </button>
               </form>
               <p style={{ fontSize: '0.8rem', color: 'var(--color-surface-400)', marginTop: '0.75rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                 Required: Zoho uses Team Workspaces, so it needs to know exactly which folder ID to use.
               </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
