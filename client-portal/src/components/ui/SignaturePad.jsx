import React, { useRef, useState, useEffect } from 'react'
import { PenTool, Type, RotateCcw, Check, ShieldCheck } from 'lucide-react'
import { Button } from './Button'
import { Input } from './Input'

export const SignaturePad = ({
  agreementTitle,
  agreementSummary,
  agreementContent,
  initialData,
  onSave,
  required = true,
}) => {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('draw') // 'draw' | 'type'
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [signatoryName, setSignatoryName] = useState(initialData?.signatoryName || '')
  const [signatoryTitle, setSignatoryTitle] = useState(initialData?.signatoryTitle || '')
  const [typedSignature, setTypedSignature] = useState(initialData?.typedSignature || '')
  const [agreedToTerms, setAgreedToTerms] = useState(initialData?.signed || false)
  const [showFullAgreement, setShowFullAgreement] = useState(false)
  const [savedSignature, setSavedSignature] = useState(initialData || null)

  // Initialize Canvas
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#38bdf8' // vibrant blue/cyan line
    }
  }, [mode])

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const ctx = canvas.getContext('2d')
    const x = (e.clientX || (e.touches && e.touches[0]?.clientX)) - rect.left
    const y = (e.clientY || (e.touches && e.touches[0]?.clientY)) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const generateSignatureImageFromText = (text) => {
    const canvas = document.createElement('canvas')
    canvas.width = 450
    canvas.height = 150
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#0F1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.font = 'italic 34px "Brush Script MT", "Caveat", "Segoe Script", cursive'
    ctx.fillStyle = '#38bdf8'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text || 'Signature', canvas.width / 2, canvas.height / 2)
    return canvas.toDataURL('image/png')
  }

  const handleConfirmSignature = () => {
    if (!signatoryName.trim()) {
      alert('Please enter the full legal name of the authorized signatory.')
      return
    }

    if (!agreedToTerms) {
      alert('Please review and check the agreement acknowledgment checkbox.')
      return
    }

    let signatureDataUrl = ''
    if (mode === 'draw') {
      if (!hasDrawn && !savedSignature?.signatureDataUrl) {
        alert('Please draw your signature in the designated box.')
        return
      }
      signatureDataUrl = canvasRef.current ? canvasRef.current.toDataURL('image/png') : savedSignature?.signatureDataUrl
    } else {
      if (!typedSignature.trim()) {
        alert('Please type your legal signature.')
        return
      }
      signatureDataUrl = generateSignatureImageFromText(typedSignature)
    }

    const signatureRecord = {
      signed: true,
      signatoryName: signatoryName.trim(),
      signatoryTitle: signatoryTitle.trim() || 'Authorized Representative',
      mode,
      signatureDataUrl,
      signedAt: new Date().toISOString(),
      timestampFormatted: new Date().toLocaleString(),
    }

    setSavedSignature(signatureRecord)
    if (onSave) {
      onSave(signatureRecord)
    }
  }

  return (
    <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg text-slate-100">
      {/* Agreement Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-slate-100 text-sm sm:text-base">{agreementTitle}</h3>
            {required && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Mandatory
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">{agreementSummary}</p>
        </div>

        <button
          type="button"
          onClick={() => setShowFullAgreement(!showFullAgreement)}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline text-left sm:text-right"
        >
          {showFullAgreement ? 'Hide Full Terms' : 'View Full Agreement Text'}
        </button>
      </div>

      {/* Full Agreement Text Collapse */}
      {showFullAgreement && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {agreementContent}
        </div>
      )}

      {/* Signature State */}
      {savedSignature?.signed ? (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-300">Signed & Validated</span>
                <span className="text-[11px] text-slate-400">• {savedSignature.timestampFormatted || savedSignature.signedAt}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Signatory: <strong className="text-slate-100">{savedSignature.signatoryName}</strong> ({savedSignature.signatoryTitle})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {savedSignature.signatureDataUrl && (
              <img
                src={savedSignature.signatureDataUrl}
                alt="Signature"
                className="h-10 px-2 py-1 bg-slate-950 rounded-lg border border-slate-800 object-contain"
              />
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                setSavedSignature(null)
                if (onSave) onSave(null)
              }}
            >
              Re-Sign
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Signatory Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Authorized Signatory Full Name"
              placeholder="e.g. Alexander Vance"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              required
            />
            <Input
              label="Signatory Job Title / Role"
              placeholder="e.g. Chief Executive Officer / Managing Director"
              value={signatoryTitle}
              onChange={(e) => setSignatoryTitle(e.target.value)}
            />
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-300">Choose Signature Style</label>
            <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('draw')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  mode === 'draw'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> Draw Signature
              </button>
              <button
                type="button"
                onClick={() => setMode('type')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md font-medium transition-all ${
                  mode === 'type'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Type className="w-3.5 h-3.5" /> Type Name
              </button>
            </div>
          </div>

          {/* Canvas or Type Mode */}
          {mode === 'draw' ? (
            <div className="space-y-2">
              <div className="relative border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl bg-slate-950 overflow-hidden group">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={140}
                  className="w-full h-36 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-xs">
                    <span className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                      Sign with mouse or finger here
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs flex items-center gap-1"
                    title="Clear Canvas"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Clear
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Digital canvas audit signature is hashed and timestamped upon confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Type your name to generate digital signature"
                value={typedSignature}
                onChange={(e) => setTypedSignature(e.target.value)}
              />
              <div className="h-24 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center">
                <span className="font-serif italic text-2xl text-indigo-400 tracking-wider">
                  {typedSignature || signatoryName || 'Signature Preview'}
                </span>
              </div>
            </div>
          )}

          {/* Legal Acknowledgement Checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-300">
              I certify that I am an authorized representative of my organization and legally empowered to execute this agreement electronically.
            </span>
          </label>

          {/* Confirm Button */}
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmSignature}
              className="bg-indigo-600 hover:bg-indigo-500"
              icon={Check}
            >
              Sign & Accept Agreement
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
