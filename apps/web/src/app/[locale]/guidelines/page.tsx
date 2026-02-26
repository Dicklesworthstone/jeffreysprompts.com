import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "Community Guidelines for JeffreysPrompts.com - Standards for respectful and constructive community participation.",
};

const tableOfContents = [
  { id: "be-respectful", title: "1. Be Respectful" },
  { id: "prohibited-content", title: "2. Prohibited Content" },
  { id: "quality-standards", title: "3. Quality Standards" },
  { id: "attribution", title: "4. Attribution and Credit" },
  { id: "enforcement", title: "5. Enforcement" },
  { id: "reporting", title: "6. Reporting Violations" },
  { id: "appeals", title: "7. Appeals Process" },
  { id: "contact", title: "8. Questions" },
];

export default function GuidelinesPage() {
  return (
    <LegalPageLayout
      title="Community Guidelines"
      lastUpdated="January 11, 2026"
      version="1.0"
      icon="guidelines"
      tableOfContents={tableOfContents}
    >
      <p className="lead">
        JeffreysPrompts.com is a place for developers and AI enthusiasts to find prompts that
        improve their work. These guidelines help maintain a welcoming, helpful, and productive
        environment for everyone.
      </p>

      <h2 id="be-respectful">1. Be Respectful</h2>
      <p>
        Treat everyone with respect. People here come from diverse backgrounds and have different
        perspectives. What connects everyone is an interest in building better tools and workflows
        with AI.
      </p>
      <ul>
        <li>Be kind and constructive in your feedback</li>
        <li>Assume good intentions from other community members</li>
        <li>Celebrate others&apos; contributions and successes</li>
        <li>Be patient with newcomers and those learning</li>
        <li>Respect different skill levels and experience</li>
      </ul>

      <h2 id="prohibited-content">2. Prohibited Content</h2>
      <p>
        The following content is not allowed on JeffreysPrompts.com:
      </p>

      <h3>Spam and Self-Promotion</h3>
      <ul>
        <li>Repetitive or unsolicited promotional content</li>
        <li>Low-quality content posted solely for visibility</li>
        <li>Misleading titles or descriptions</li>
      </ul>

      <h3>Harmful or Malicious Prompts</h3>
      <ul>
        <li>Prompts designed to generate malware or exploit code</li>
        <li>Prompts intended to bypass AI safety measures</li>
        <li>Prompts that could enable fraud, scams, or deception</li>
        <li>Prompts for generating CSAM or other illegal content</li>
      </ul>

      <h3>Copyright Infringement</h3>
      <ul>
        <li>Prompts copied from paid courses or books without permission</li>
        <li>Content that violates others&apos; intellectual property rights</li>
        <li>Prompts that encourage copyright infringement</li>
      </ul>

      <h3>Hate Speech and Harassment</h3>
      <ul>
        <li>Content that promotes hatred based on identity or background</li>
        <li>Targeted harassment or bullying of individuals</li>
        <li>Threats or advocacy of violence</li>
        <li>Doxxing or sharing others&apos; personal information</li>
      </ul>

      <h3>Personal Information</h3>
      <ul>
        <li>Sharing others&apos; private information without consent</li>
        <li>Including API keys, passwords, or credentials in prompts</li>
        <li>Prompts designed to extract personal information</li>
      </ul>

      <h2 id="quality-standards">3. Quality Standards</h2>
      <p>
        This library aims for high quality. When contributing prompts:
      </p>
      <ul>
        <li>
          <strong>Test your prompts</strong> - Make sure they work as intended across different AI
          models
        </li>
        <li>
          <strong>Be specific</strong> - Vague prompts are less useful than concrete, actionable
          ones
        </li>
        <li>
          <strong>Provide context</strong> - Explain when and why to use the prompt
        </li>
        <li>
          <strong>Include examples</strong> - Show what good input and output looks like
        </li>
        <li>
          <strong>Keep it focused</strong> - One prompt, one purpose
        </li>
        <li>
          <strong>Document limitations</strong> - Note any edge cases or known issues
        </li>
      </ul>

      <h2 id="attribution">4. Attribution and Credit</h2>
      <p>
        Proper attribution matters:
      </p>
      <ul>
        <li>
          <strong>Credit sources</strong> - If your prompt is inspired by or builds on someone
          else&apos;s work, give them credit
        </li>
        <li>
          <strong>Be honest about authorship</strong> - Only claim credit for work you created or
          significantly modified
        </li>
        <li>
          <strong>Respect licenses</strong> - Follow the terms of any license attached to prompts
          you use or modify
        </li>
        <li>
          <strong>Link to original work</strong> - When referencing external resources, include
          links
        </li>
      </ul>

      <h2 id="enforcement">5. Enforcement</h2>
      <p>
        Violations of these guidelines are taken seriously. Depending on the severity, consequences may include:
      </p>
      <ul>
        <li>
          <strong>Warn</strong> - Send a friendly reminder for minor or first-time issues
        </li>
        <li>
          <strong>Remove content</strong> - Take down prompts or comments that violate guidelines
        </li>
        <li>
          <strong>Restrict access</strong> - Temporarily limit your ability to contribute
        </li>
        <li>
          <strong>Suspend account</strong> - For serious or repeated violations
        </li>
        <li>
          <strong>Ban permanently</strong> - For egregious violations or pattern of abuse
        </li>
      </ul>
      <p>
        Enforcement aims to be fair and proportionate. Most issues can be resolved with a friendly
        conversation.
      </p>

      <h2 id="reporting">6. Reporting Violations</h2>
      <p>
        If you see content that violates these guidelines, please report it:
      </p>
      <ul>
        <li>
          <strong>Email</strong> -{" "}
          <a href="mailto:report@jeffreysprompts.com">report@jeffreysprompts.com</a>
        </li>
        <li>
          <strong>GitHub</strong> - Open an issue with the &quot;report&quot; label
        </li>
        <li>
          <strong>In-app</strong> - Use the &quot;Report&quot; button (coming soon)
        </li>
      </ul>
      <p>
        When reporting, please include:
      </p>
      <ul>
        <li>Link to the content</li>
        <li>Which guideline was violated</li>
        <li>Any additional context</li>
      </ul>
      <p>
        All reports are reviewed personally. Reporter identities are kept confidential.
      </p>

      <h2 id="appeals">7. Appeals Process</h2>
      <p>
        If you believe your content was removed in error, or you were unfairly penalized:
      </p>
      <ol>
        <li>
          Email <a href="mailto:appeals@jeffreysprompts.com">appeals@jeffreysprompts.com</a> with
          your appeal
        </li>
        <li>Explain why you believe the decision was incorrect</li>
        <li>Provide any relevant context or evidence</li>
        <li>Allow up to 5 business days for a response</li>
      </ol>
      <p>
        Appeals are reviewed by someone other than the person who made the original decision.
      </p>

      <h2 id="contact">8. Questions</h2>
      <p>
        If you have questions about these guidelines or need clarification:
      </p>
      <ul>
        <li>
          Email:{" "}
          <a href="mailto:community@jeffreysprompts.com">community@jeffreysprompts.com</a>
        </li>
        <li>
          GitHub Discussions:{" "}
          <a
            href="https://github.com/Dicklesworthstone/jeffreysprompts.com/discussions"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/Dicklesworthstone/jeffreysprompts.com/discussions
          </a>
        </li>
        <li>
          Twitter:{" "}
          <a
            href="https://twitter.com/doodlestein"
            target="_blank"
            rel="noopener noreferrer"
          >
            @doodlestein
          </a>
        </li>
      </ul>

      <div className="not-prose mt-8 p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Thanks for being here!
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          These guidelines exist to keep things running smoothly. By using JeffreysPrompts.com,
          you help make AI development better for everyone.
        </p>
      </div>
    </LegalPageLayout>
  );
}
