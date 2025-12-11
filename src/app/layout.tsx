import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from 'next-themes';
import { ClientWalletProvider } from '@/components/providers/ClientWalletProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClientWalletProvider>
            {children}
            <Toaster />
          </ClientWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
