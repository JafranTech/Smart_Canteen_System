// ─── Client-side QR helpers ──────────────────────────────────
// Note: AES Decryption and validation run securely on the server in Edge Functions.
// No private secrets exist in this client bundle.

export function formatTokenForDisplay(orderId) {
  return String(orderId)
}
