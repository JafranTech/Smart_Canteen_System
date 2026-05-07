import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, StopCircle } from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────
const SCAN_COOLDOWN_MS  = 3000
const SCANNER_CONFIG    = { fps: 10, qrbox: { width: 250, height: 250 } }
const AUTOSTART_DELAY_MS = 300

export default function ScannerView({ onScanSuccess }) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef     = useRef(null)
  // Debounce: prevent the same QR from firing multiple callbacks
  const lastScannedRef  = useRef(null)
  const scanCooldownRef = useRef(false)

  const startScanner = async () => {
    try {
      setError('')
      const onScan = (decodedText) => {
        // Ignore rapid-fire duplicate scans (same QR code read multiple times per second)
        if (scanCooldownRef.current) return
        if (lastScannedRef.current === decodedText) return

        // Lock scanner for SCAN_COOLDOWN_MS to prevent toast spam
        scanCooldownRef.current  = true
        lastScannedRef.current   = decodedText
        setTimeout(() => { scanCooldownRef.current = false }, SCAN_COOLDOWN_MS)

        if (onScanSuccess) onScanSuccess(decodedText)
      }

      try {
        await scannerRef.current.start({ facingMode: 'environment' }, SCANNER_CONFIG, onScan, () => {})
      } catch (envErr) {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          await scannerRef.current.start(devices[0].id, SCANNER_CONFIG, onScan, () => {})
        } else {
          throw new Error('No cameras found.')
        }
      }
      setIsScanning(true)
    } catch (err) {
      console.error('[ScannerView] startScanner failed:', err)
      setError('Camera access denied or unavailable.')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch (err) {
        console.error('[ScannerView] stopScanner failed:', err)
      }
    }
  }

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader')

    // Auto-start after DOM element is fully painted
    const timer = setTimeout(() => {
      startScanner()
    }, AUTOSTART_DELAY_MS)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full flex justify-center flex-col items-center">
      {/* overflow-visible is critical — overflow-hidden clips the injected <video> */}
      <div
        id="qr-reader"
        className="w-full max-w-sm rounded-3xl overflow-visible border border-white/10 relative min-h-[300px]"
      />

      {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}

      <div className="mt-8">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-8 py-4 bg-imperial text-white rounded-full font-bold shadow-[0_0_20px_rgba(251,54,64,0.3)] hover:shadow-[0_0_30px_rgba(251,54,64,0.5)] active:scale-[0.98] transition-all"
          >
            <Camera className="w-6 h-6" /> Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full font-bold hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <StopCircle className="w-6 h-6" /> Stop Scanner
          </button>
        )}
      </div>

      {/* Manual Input for E2E Testing */}
      <div className="mt-8 w-full max-w-sm">
        <p className="text-xs text-white/40 text-center mb-2">Simulate Scan (E2E Testing)</p>
        <div className="flex gap-2">
          <input
            type="text"
            id="e2e-qr-input"
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-imperial"
            placeholder="Paste encrypted QR token (from browser console)"
          />
          <button
            onClick={() => {
              const val = document.getElementById('e2e-qr-input').value
              if (val && onScanSuccess) onScanSuccess(val)
            }}
            id="e2e-scan-btn"
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-sm font-bold transition-colors"
          >
            Test
          </button>
        </div>
      </div>
    </div>
  )
}
