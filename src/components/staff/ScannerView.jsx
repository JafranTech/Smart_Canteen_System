import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, StopCircle } from 'lucide-react'

export default function ScannerView({ onScanSuccess }) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const scannerRef = useRef(null)

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader')

    return () => {
      // Ignore warnings from stopping unstarted scanner
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanner = async () => {
    try {
      setError('')
      const config = { fps: 10, qrbox: { width: 250, height: 250 } }
      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (onScanSuccess) onScanSuccess(decodedText)
        },
        () => {} // ignore frame errors
      )
      setIsScanning(true)
    } catch (err) {
      console.error(err)
      setError('Camera access denied or unavailable.')
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch (err) {
        console.error(err)
      }
    }
  }

  return (
    <div className="w-full flex justify-center flex-col items-center">
      <div 
        id="qr-reader" 
        className="w-full max-w-sm aspect-square bg-white/5 rounded-3xl overflow-hidden flex items-center justify-center border border-white/10 relative"
      >
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white/40 text-sm">Camera inactive</p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
      
      <div className="mt-8">
        {!isScanning ? (
          <button 
            onClick={startScanner}
            className="flex items-center gap-2 px-8 py-4 bg-[#FB3640] text-white rounded-full font-bold shadow-[0_0_20px_rgba(251,54,64,0.3)] hover:shadow-[0_0_30px_rgba(251,54,64,0.5)] active:scale-[0.98] transition-all"
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
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[#FB3640]"
            placeholder="Paste raw QR token here..."
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
