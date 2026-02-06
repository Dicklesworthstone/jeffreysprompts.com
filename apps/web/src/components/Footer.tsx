import Link from "next/link";
import { Sparkles, Twitter, Github, ExternalLink, Mail } from "lucide-react";
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
    <footer className={cn("border-t border-border/40 bg-muted/30", className)}>
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2 space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span>JeffreysPrompts</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              The prompt library for AI power users. Discover, create, and share prompts for Claude, GPT, and beyond.
            </p>
            <div className="flex gap-3">
              <a
                href="https://twitter.com/doodlestein"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/Dicklesworthstone/jeffreysprompts.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
              <a
                href="mailto:hello@jeffreysprompts.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Resources</h3>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  {"external" in link && link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                    >
                      {link.label}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CLI */}
          <div>
            <h3 className="font-semibold text-sm mb-4">CLI Tool</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Install from your terminal:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono block break-all">
              curl -fsSL jeffreysprompts.com/install.sh | bash
            </code>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} Jeffrey Emanuel. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {ecosystemLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
