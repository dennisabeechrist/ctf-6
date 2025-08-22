import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'CTF Arcade',
  description: 'Beat Admin to get the flag',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-black text-[#00ffcc] font-mono">
        {children}
      </body>
    </html>
  );
}
