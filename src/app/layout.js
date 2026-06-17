import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata = {
  title: 'RecruitFlow — Apply for Open Positions',
  description: 'Browse and apply for exciting career opportunities. Upload your resume and join our team.',
  keywords: 'jobs, careers, apply, resume, hiring',
};

/**
 * Root Layout (Server Component)
 * 
 * Route: `/`
 * 
 * The outermost Next.js layout that wraps EVERY page in the application.
 * It is responsible for injecting global CSS, Next/Font CSS variables, 
 * and rendering the global `ThemeToggle` client component.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, var(--font-sans))' }}>
        {children}
      </body>
    </html>
  );
}
