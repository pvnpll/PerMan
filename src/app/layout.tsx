import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PerMan — Personal Management & Task Reminder App',
  description: 'Your personal external memory for tasks, reminders, purchases, and projects.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full bg-[#0c0e12] text-zinc-200 antialiased`}>
        {children}
      </body>
    </html>
  );
}
