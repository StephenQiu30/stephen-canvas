import { Provider } from '@/components/provider';
import { Geist, Geist_Mono } from 'next/font/google';
import '../global.css';
import { i18n } from '@/lib/i18n';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;

  return (
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans">
        <Provider locale={lang}>{children}</Provider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}
