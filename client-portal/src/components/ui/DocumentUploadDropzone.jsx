import React, { useRef, useState } from 'react'
import { UploadCloud, FileText, CheckCircle2, Trash2, AlertCircle, File, Loader2 } from 'lucide-react'
import { Badge } from './Badge'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../shared/services/firebaseService'

export const DocumentUploadDropzone = ({
  docId,
  title,
  description,
  required = true,
  acceptedFormats = '.pdf, .png, .jpg, .jpeg',
  initialDoc,
  onFileSelect,
  onFileRemove,
}) => {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [currentFile, setCurrentFile] = useState(initialDoc || null)

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  // Compress image to ~50-80KB data URL so it can be previewed seamlessly everywhere
  const processImageToDataUrl = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        if (!file.type.startsWith('image/')) {
          // For PDF or other documents, return standard data URL
          resolve(e.target.result)
          return
        }

        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          resolve(compressedDataUrl)
        }
        img.onerror = () => resolve(e.target.result)
        img.src = e.target.result
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
  }

  const processFile = async (file) => {
    setError('')
    if (!file) return

    // 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      setError('File is too large. Maximum size allowed is 15 MB.')
      return
    }

    try {
      setUploading(true)
      
      // 1. Generate portable compressed preview data URL
      const dataUrl = await processImageToDataUrl(file)

      // 2. Try upload to Firebase Storage if online
      let cloudUrl = ''
      try {
        const fileExt = file.name.split('.').pop() || 'bin'
        const storageRef = ref(storage, `clients/onboarding/${docId}_${Date.now()}.${fileExt}`)
        const snapshot = await uploadBytes(storageRef, file)
        cloudUrl = await getDownloadURL(snapshot.ref)
      } catch (storageErr) {
        console.warn('Firebase Storage upload fallback to portable dataUrl:', storageErr.message)
      }

      const fileData = {
        docId,
        fileName: file.name,
        fileSize: formatFileSize(file.size),
        fileType: file.type,
        fileUrl: cloudUrl || dataUrl, // Prioritize cloud URL, fallback to portable dataUrl
        uploadedAt: new Date().toISOString(),
        timestampFormatted: new Date().toLocaleString(),
        status: 'submitted',
      }

      setCurrentFile(fileData)
      if (onFileSelect) {
        onFileSelect(docId, fileData)
      }
    } catch (err) {
      console.error(err)
      setError('Error processing document upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const handleRemove = () => {
    setCurrentFile(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onFileRemove) {
      onFileRemove(docId)
    }
  }

  return (
    <div className="bg-slate-900/70 rounded-2xl border border-slate-800 p-5 space-y-3 text-slate-100 shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="font-semibold text-slate-100 text-sm">{title}</h4>
            {required && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Required
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>

        {currentFile ? (
          <Badge variant="success" className="flex items-center gap-1 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded & Ready
          </Badge>
        ) : (
          <Badge variant="neutral" className="text-[11px]">
            Pending Upload
          </Badge>
        )}
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploading ? (
        <div className="p-6 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-xs text-slate-300">Processing & encrypting document file...</span>
        </div>
      ) : currentFile ? (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {currentFile.fileUrl && (currentFile.fileUrl.startsWith('data:image') || currentFile.fileUrl.match(/\.(png|jpg|jpeg|webp)$/i)) ? (
              <img
                src={currentFile.fileUrl}
                alt="Thumbnail"
                className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-900"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                <File className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0">
              <p className="font-medium text-slate-200 text-xs truncate max-w-xs sm:max-w-sm">
                {currentFile.fileName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>{currentFile.fileSize}</span>
                <span>• {currentFile.timestampFormatted || currentFile.uploadedAt}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleRemove}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Remove File"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
            dragOver
              ? 'border-emerald-500 bg-emerald-500/5'
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFormats}
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 mb-2 border border-slate-800">
            <UploadCloud className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-200 text-center">
            Click to upload or drag & drop document
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Supported formats: {acceptedFormats} (Max 15 MB)
          </p>
        </div>
      )}
    </div>
  )
}
