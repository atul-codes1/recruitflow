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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body style={{ fontFamily: 'var(--font-inter, var(--font-sans))' }}>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
