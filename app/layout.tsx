import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google'; // 🟢 1. Yangi shriftni import qildik
import './globals.css'; 
import { AuthProvider } from '@/lib/AuthContext'; 
import { Toaster } from 'react-hot-toast'; 

// 🟢 2. Shriftni sozlaymiz (FIXED: 'cyrillic' changed to 'cyrillic-ext')
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin', 'cyrillic-ext'],
  variable: '--font-jakarta', // Tailwind ga ulash uchun maxsus o'zgaruvchi yaratamiz
});

export const metadata: Metadata = {
  title: 'Edify | O\'qituvchi Portali',
  description: 'Zamonaviy ta\'lim platformasi orqali darslarni avtomatlashtiring.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 🟢 3. Shrift o'zgaruvchisini <html> ga beramiz
    <html lang="uz" className={`${jakarta.variable}`}>
      {/* 🟢 4. antialiased va font-sans klasslarini qo'shdik */}
      <body className="font-sans antialiased bg-white text-slate-900">
        
        <AuthProvider>
          {children}
          <Toaster position="top-center" toastOptions={{ duration: 1500 }}/>
        </AuthProvider>
      </body>
    </html>
  );
}