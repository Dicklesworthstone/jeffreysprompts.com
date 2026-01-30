import type { Metadata } from "next";
import Link from "next/link";
import { HelpLayout, ArticleContent } from "@/components/help/HelpLayout";

export const metadata: Metadata = {
  title: "Installing the CLI - Help Center",
  description: "Learn how to install the jfp command-line tool on your system.",
};

export default function InstallationPage() {
  return (
    <HelpLayout
      title="Installing the CLI"
      category="cli"
    >
      <ArticleContent>
        <p className="lead">
          The <code>jfp</code> CLI gives you terminal access to the entire JeffreysPrompts library.
        </p>
        <p>
          The CLI is free to install and use with public prompts. Pro accounts unlock private vault
          access (<code>list --mine</code>, <code>search --saved</code>), plus save/sync, notes,
          collections, and premium packs.
        </p>

        <h2>Quick install</h2>
        <p>
          The fastest way to install jfp is using the install script:
        </p>
        <pre>{`curl -fsSL https://jeffreysprompts.com/install.sh | bash`}</pre>
        <p>
          This downloads the appropriate binary for your platform and installs it to <code>/usr/local/bin</code>.
        </p>

        <h2>Package managers</h2>
        <h3>Homebrew (macOS/Linux)</h3>
        <pre>{`brew install jeffreysprompts/tap/jfp`}</pre>

        <h3>npm/bun (Node.js)</h3>
        <pre>{`# Using npm
npm install -g @jeffreysprompts/cli

# Using bun
bun install -g @jeffreysprompts/cli`}</pre>

        <h2>Manual download</h2>
        <p>
          Download pre-built binaries from the{" "}
          <a href="https://github.com/Dicklesworthstone/jeffreysprompts.com/releases" target="_blank" rel="noopener noreferrer">
            GitHub releases page
          </a>. Available platforms:
        </p>
        <ul>
          <li><code>jfp-darwin-arm64</code> — macOS (Apple Silicon)</li>
          <li><code>jfp-darwin-x64</code> — macOS (Intel)</li>
          <li><code>jfp-linux-x64</code> — Linux (x86_64)</li>
          <li><code>jfp-linux-arm64</code> — Linux (ARM64)</li>
          <li><code>jfp-windows-x64.exe</code> — Windows</li>
        </ul>
        <p>
          After downloading:
        </p>
        <pre>{`# Make executable (macOS/Linux)
chmod +x jfp-darwin-arm64

# Move to PATH
sudo mv jfp-darwin-arm64 /usr/local/bin/jfp

# Verify installation
jfp --version`}</pre>

        <h2>Build from source</h2>
        <p>
          If you prefer to build from source, you&apos;ll need <a href="https://bun.sh" target="_blank" rel="noopener noreferrer">Bun</a> installed:
        </p>
        <pre>{`# Clone the repository
git clone https://github.com/Dicklesworthstone/jeffreysprompts.com.git
cd jeffreysprompts.com

# Build the CLI
bun build --compile ./jfp.ts --outfile jfp

# Install
sudo mv jfp /usr/local/bin/`}</pre>

        <h2>Verify installation</h2>
        <p>
          After installing, verify jfp is working:
        </p>
        <pre>{`jfp --version
# jeffreysprompts-cli v1.0.0

jfp --help
# Shows usage information`}</pre>

        <h2>Shell completion</h2>
        <p>
          Enable shell completion for a better experience:
        </p>
        <pre>{`# Bash
jfp completion bash >> ~/.bashrc

# Zsh
jfp completion zsh >> ~/.zshrc

# Fish
jfp completion fish > ~/.config/fish/completions/jfp.fish`}</pre>

        <h2>Troubleshooting</h2>
        <h3>Command not found</h3>
        <p>
          Make sure <code>/usr/local/bin</code> is in your PATH:
        </p>
        <pre>{`echo $PATH | grep -q /usr/local/bin || echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc`}</pre>

        <h3>Permission denied</h3>
        <p>
          On macOS, you may need to allow the binary in System Preferences → Security & Privacy.
        </p>

        <h2>Next steps</h2>
        <ul>
          <li>
            <Link href="/help/cli/basic-usage">Learn basic CLI usage</Link>
          </li>
          <li>
            <Link href="/help/cli/search-commands">Master search commands</Link>
          </li>
        </ul>
      </ArticleContent>
    </HelpLayout>
  );
}
