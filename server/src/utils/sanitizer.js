/**
 * Server-side HTML & input sanitizer to prevent XSS and arbitrary executable JS in lessons,
 * announcements, discussions, and text responses.
 */
function sanitizeRichHtml(input) {
  if (typeof input !== 'string') return '';
  return input
    // Remove <script>, <object>, <embed>, <applet>, <meta>, <link>, <style>, <form> tags and contents
    .replace(/<\s*(script|object|embed|applet|meta|link|style|form|base)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|object|embed|applet|meta|link|style|form|base)[^>]*\/?>/gi, '')
    // Remove inline event handlers like onclick=, onerror=, onload=
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    // Neutralize javascript: and data:text/html URIs
    .replace(/(href|src|action)\s*=\s*["']?\s*(javascript:|vbscript:|data:text\/html)[^"'\s>]*/gi, '$1="#"');
}

function sanitizePlainText(input) {
  if (typeof input !== 'string') return '';
  return input.trim();
}

module.exports = {
  sanitizeRichHtml,
  sanitizePlainText
};

