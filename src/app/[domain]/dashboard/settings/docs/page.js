import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Google Drive Integration Documentation
 * 
 * Route: `/[domain]/dashboard/settings/docs`
 * 
 * Static help page providing step-by-step instructions for generating
 * Google Cloud Platform (GCP) Service Account credentials. 
 * Kept mostly for legacy reasons as BYOS OAuth is now preferred.
 */
export default async function DocsPage({ params }) {
  const { domain } = await params;

  return (
    <div className="animate-fade" style={{ paddingBottom: '4rem', maxWidth: '800px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <Link href={`/${domain}/dashboard/settings`} style={{ color: 'var(--color-primary-400)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 600 }}>
          ← Back to Settings
        </Link>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'var(--font-outfit, var(--font-display))', color: 'var(--color-surface-100)', marginBottom: '0.5rem' }}>
          Google Drive Integration
        </h1>
        <p style={{ color: 'var(--color-surface-400)', fontSize: '1.125rem' }}>Learn how to generate GCP Service Account credentials.</p>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ color: 'var(--color-surface-200)', lineHeight: 1.7 }}>
          <h2 style={{ color: 'var(--color-surface-100)', marginTop: 0, marginBottom: '1rem', fontSize: '1.5rem' }}>Overview</h2>
          <p style={{ marginBottom: '2rem' }}>
            To securely upload candidate resumes to your Google Drive, RecruitFlow uses a <strong>Google Service Account</strong>. This is a special, secure robot account that acts on behalf of our application so you don't have to manually log in.
          </p>

          <h3 style={{ color: 'var(--color-surface-100)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: 'var(--color-primary-600)', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>1</span>
            Create a GCP Project & Enable API
          </h3>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Go to the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: '#00a4ef' }}>Google Cloud Console</a> and log in.</li>
            <li>Click the project dropdown at the top and select <strong>New Project</strong>. Name it <em>RecruitFlow ATS</em>.</li>
            <li>In the search bar, type <strong>Google Drive API</strong> and click on it.</li>
            <li>Click <strong>Enable</strong>.</li>
          </ol>

          <h3 style={{ color: 'var(--color-surface-100)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: 'var(--color-primary-600)', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>2</span>
            Create a Service Account
          </h3>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>In the left menu, go to <strong>IAM & Admin &gt; Service Accounts</strong>.</li>
            <li>Click <strong>+ Create Service Account</strong>.</li>
            <li>Give it a name like <em>recruitflow-bot</em> and click <strong>Create and Continue</strong>.</li>
            <li>You can skip granting specific roles and just click <strong>Done</strong>.</li>
          </ol>

          <h3 style={{ color: 'var(--color-surface-100)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: 'var(--color-primary-600)', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>3</span>
            Generate the Private Key
          </h3>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Click on the email address of the Service Account you just created.</li>
            <li>Go to the <strong>Keys</strong> tab.</li>
            <li>Click <strong>Add Key &gt; Create new key</strong>. Select <strong>JSON</strong> and click Create.</li>
            <li>A file will download to your computer. Open this JSON file in any text editor.</li>
            <li>Copy the <code>project_id</code>, <code>client_email</code>, and the entire <code>private_key</code> (including the BEGIN and END lines) and paste them into the RecruitFlow settings.</li>
          </ol>

          <h3 style={{ color: 'var(--color-surface-100)', marginTop: '2rem', marginBottom: '1rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ background: 'var(--color-primary-600)', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>4</span>
            Share Your Drive Folder (CRITICAL)
          </h3>
          <p style={{ marginBottom: '2rem' }}>
            The Service Account is a robot, which means it has its own empty Google Drive. For it to upload files to <em>your</em> Drive, you must share a folder with it:
          </p>
          <ol style={{ paddingLeft: '1.5rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>Go to your personal Google Drive and create a new folder named <em>RecruitFlow Resumes</em>.</li>
            <li>Right-click the folder and select <strong>Share</strong>.</li>
            <li>Paste the <strong>Service Account Email</strong> (the one ending in <code>@iam.gserviceaccount.com</code>) into the share box.</li>
            <li>Make sure it is set to <strong>Editor</strong> and click Send.</li>
          </ol>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginTop: '3rem' }}>
            <h4 style={{ color: '#10b981', margin: '0 0 0.5rem 0', fontSize: '1.125rem' }}>✅ You are all set!</h4>
            <p style={{ margin: 0, fontSize: '0.9375rem' }}>
              Our platform will now authenticate as your Service Account and pipe all future candidate resumes directly into that shared Google Drive folder.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
