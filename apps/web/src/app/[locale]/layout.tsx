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

// ... rest of imports and functions

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <SkipLink targetId="main-content" />
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
