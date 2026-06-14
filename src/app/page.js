import { redirect } from 'next/navigation';

/**
 * Root Landing Page
 * 
 * Route: `/`
 * 
 * Since this is an internal dashboard / multi-tenant app, the root path 
 * currently redirects directly to the `/login` page. In the future, this 
 * could host a marketing landing page.
 */
export default function SaaSLandingPage() {
  redirect('/login');
}
