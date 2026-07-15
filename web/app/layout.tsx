import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MeowPay',
  description: 'Send treats to other cats.',
};

/** Root layout — wraps every page. Global styles are imported once here. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
