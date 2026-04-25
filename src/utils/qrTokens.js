import CryptoJS from 'crypto-js'

const SECRET = import.meta.env.VITE_QR_SECRET

// ─── Encrypt order token for QR code ─────────────────────────
// Never store raw order IDs. Always encrypt before generating QR.
export function encryptToken(orderId) {
  return CryptoJS.AES.encrypt(String(orderId), SECRET).toString()
}

// ─── Decrypt scanned QR token ─────────────────────────────────
// Returns null if decryption fails (invalid/tampered token)
export function decryptToken(token) {
  try {
    const bytes = CryptoJS.AES.decrypt(token, SECRET)
    const result = bytes.toString(CryptoJS.enc.Utf8)
    return result || null
  } catch {
    return null
  }
}
