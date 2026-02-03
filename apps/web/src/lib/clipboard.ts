/**
 * Cross-browser clipboard utility with iOS Safari fallback
 *
 * iOS Safari has quirks with the Clipboard API:
 * - navigator.clipboard may exist but still fail in certain contexts (WKWebView, PWA)
 * - The fallback uses a visible textarea (not offscreen) for reliable selection
 * - Requires user gesture context (click handler) for both methods
 *
 * @module lib/clipboard
 */

export interface CopyResult {
  success: boolean;
  error?: Error;
}

/**
 * Copy text to clipboard with iOS Safari fallback
 *
 * @param text - The text to copy to clipboard
 * @returns Promise resolving to success/failure result
 *
 * @example
 * ```ts
 * const result = await copyToClipboard("Hello world");
 * if (result.success) {
 *   console.log("Copied!");
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<CopyResult> {
  // Try modern Clipboard API first
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true };
    } catch (err) {
      // Clipboard API failed (common in iOS Safari PWA/WKWebView)
      // Fall through to textarea method
      console.warn("Clipboard API failed, trying fallback:", err);
    }
  }

  // Fallback for iOS Safari and older browsers
  // Key iOS quirks addressed:
  // 1. Textarea must not be completely offscreen (use opacity instead)
  // 2. readonly attribute prevents keyboard popup
  // 3. contentEditable + readOnly combo works best on iOS
  // 4. setSelectionRange is required for iOS
  const textarea = document.createElement("textarea");
  try {
    textarea.value = text;

    // Style to be invisible but in viewport (iOS needs this)
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.width = "2em";
    textarea.style.height = "2em";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.boxShadow = "none";
    textarea.style.background = "transparent";
    textarea.style.opacity = "0";
    textarea.style.zIndex = "-1";

    // Prevent keyboard on iOS
    textarea.setAttribute("readonly", "");
    textarea.contentEditable = "true";

    document.body.appendChild(textarea);

    // iOS-specific selection
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textarea.setSelectionRange(0, text.length);
    } else {
      textarea.select();
      textarea.setSelectionRange(0, text.length);
    }

    const success = document.execCommand("copy");

    if (!success) {
      throw new Error("execCommand('copy') returned false");
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Clipboard fallback failed:", error);
    return { success: false, error };
  } finally {
    // Always clean up the textarea, even if an error occurred
    if (textarea.parentNode) {
      textarea.parentNode.removeChild(textarea);
    }
  }
}
