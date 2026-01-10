import Link from "next/link";
import { Sparkles, Twitter, Github, ExternalLink } from "lucide-react";

const quickLinks = [
  { href: "/", label: "Browse Prompts" },
  { href: "/bundles", label: "Bundles" },
  { href: "/contribute", label: "Contribute" },
  { href: "/how_it_was_made", label: "How It Was Made" },
];

const ecosystemLinks = [
  { href: "https://jeffreyemanuel.com", label: "jeffreyemanuel.com", external: true },
  { href: "https://agent-flywheel.com", label: "agent-flywheel.com", external: true },
];

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              href="/"
              className="flex items-center gap-2 font-semibold text-lg"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span>JeffreysPrompts</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Curated prompts for agentic coding. Browse, copy, install as Claude Code skills.
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
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
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

          {/* Ecosystem */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Ecosystem</h3>
            <ul className="space-y-2">
              {ecosystemLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CLI */}
          <div>
            <h3 className="font-semibold text-sm mb-4">CLI Tool</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Install prompts directly from your terminal:
            </p>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              curl -fsSL jeffreysprompts.com/install-cli.sh | bash
            </code>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 pt-8 border-t border-border/40">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {currentYear} Jeffrey Emanuel. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
