import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";
import { BottomNav } from "@/components/BottomNav";
import { Footer } from "@/components/Footer";
import { SkipLink } from "@/components/ui/skip-link";
import { locales, type Locale } from "@/i18n/config";
import { MouseSpotlight } from "@/components/desktop/MouseSpotlight";

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Get messages for this locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <SkipLink targetId="main-content" />
        <MouseSpotlight />
        <Nav />
        <main id="main-content" tabIndex={-1} className="min-h-screen pb-20 md:pb-0 focus:outline-none">
          {children}
        </main>
        <Footer className="hidden md:block" />
        <BottomNav />
      </Providers>
    </NextIntlClientProvider>
  );
}
