"use client";

import Link from "next/link";
import { Sparkles, Twitter, Github, ExternalLink, Mail, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const productLinks = [
  { href: "/", label: "Browse Prompts" },
  { href: "/bundles", label: "Bundles" },
  { href: "/workflows", label: "Workflows" },
  { href: "/pricing", label: "Pricing" },
];

const resourceLinks = [
  { href: "/contribute", label: "Contribute" },
  { href: "/contact", label: "Contact Support" },
  { href: "/how_it_was_made", label: "How It Was Made" },
  { href: "https://github.com/Dicklesworthstone/jeffreysprompts.com", label: "Documentation", external: true },
];

const legalLinks = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/guidelines", label: "Community Guidelines" },
];

const ecosystemLinks = [
  { href: "https://jeffreyemanuel.com", label: "jeffreyemanuel.com", external: true },
  { href: "https://agent-flywheel.com", label: "agent-flywheel.com", external: true },
];

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("relative border-t border-neutral-200 dark:border-neutral-800 overflow-hidden", className)}>
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10 bg-neutral-50 dark:bg-neutral-950" />
      <div className="absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <filter id="footer-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#footer-noise)" />
        </svg>
      </div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 lg:py-24"
      >
        <div className="grid grid-cols-2 gap-12 md:grid-cols-3 lg:grid-cols-6 mb-16 lg:mb-24">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-6">
            <Link
              href="/"
              className="group flex items-center gap-3 font-bold text-xl transition-all"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <span className="tracking-tight">
                Jeffreys<span className="text-indigo-500">Prompts</span>
              </span>
            </Link>
            <p className="text-base text-neutral-500 dark:text-neutral-400 max-w-xs leading-relaxed font-medium">
              The premium prompt library for AI power users. Ship faster with battle-tested patterns.
            </p>
            <div className="flex gap-4">
              {[
                { icon: Twitter, href: "https://twitter.com/doodlestein", label: "Twitter" },
                { icon: Github, href: "https://github.com/Dicklesworthstone/jeffreysprompts.com", label: "GitHub" },
                { icon: Mail, href: "mailto:hello@jeffreysprompts.com", label: "Email" },
              ].map((social) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ y: -3, scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors shadow-sm"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-6">
            <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-400">Product</h3>
            <ul className="space-y-4">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-semibold text-neutral-500 hover:text-indigo-500 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-6">
            <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-400">Resources</h3>
            <ul className="space-y-4">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-neutral-500 hover:text-indigo-500 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                    >
                      {link.label}
                      <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm font-semibold text-neutral-500 hover:text-indigo-500 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-6">
            <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-400">Legal</h3>
            <ul className="space-y-4">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm font-semibold text-neutral-500 hover:text-indigo-500 dark:text-neutral-400 dark:hover:text-indigo-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CLI */}
          <div className="space-y-6">
            <h3 className="font-bold text-xs uppercase tracking-widest text-neutral-400">CLI Tool</h3>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-10 transition duration-500" />
              <div className="relative p-4 rounded-xl bg-neutral-900 dark:bg-black border border-white/5 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                  </div>
                </div>
                <code className="text-xs font-mono text-neutral-300 block break-all leading-relaxed">
                  curl -fsSL jeffreysprompts.com/install-cli.sh | bash
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-500">
            &copy; {currentYear} Jeffrey Emanuel. <span className="hidden sm:inline">Built for the future of agentic coding.</span>
          </p>
          <div className="flex items-center gap-6 text-sm font-bold">
            {ecosystemLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                {link.label}
                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </footer>
  );
}