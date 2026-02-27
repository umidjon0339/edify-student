import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; 
import { AuthProvider } from '@/lib/AuthContext'; 
import { Toaster } from 'react-hot-toast'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EdifyStudent | Teacher',
  description: 'Master Algebra, Geometry, and more with gamified lessons.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-slate-900`}>
        
        <AuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 3000 }}/>
        </AuthProvider>
      </body>
    </html>
  );
}