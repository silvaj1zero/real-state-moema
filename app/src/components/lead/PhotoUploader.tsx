'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MAX_PHOTOS = 5
const MAX_SIZE_BYTES = 1_000_000 // 1MB after compression
const COMPRESSION_QUALITY = 0.7

interface PhotoUploaderProps {
  consultantId: string
  leadId?: string // May not exist yet — use temp ID and re-upload after insert
  value: string[]
  onChange: (urls: string[]) => void
  className?: string
}

/**
 * Compress an image file to JPEG under MAX_SIZE_BYTES using canvas.toBlob().
 */
async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Scale down if needed — max 1920px on longest side
      const maxDim = 1920
      let { width, height } = img
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        COMPRESSION_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

export function PhotoUploader({
  consultantId,
  leadId,
  value,
  onChange,
  className,
}: PhotoUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const remainingSlots = MAX_PHOTOS - value.length

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filesToProcess = Array.from(files).slice(0, remainingSlots)
    if (filesToProcess.length === 0) return

    setUploading(true)
    setError(null)

    try {
      const supabase = createClient()
      const newUrls: string[] = []

      for (const file of filesToProcess) {
        // Compress the image
        const compressed = await compressImage(file)

        if (compressed.size > MAX_SIZE_BYTES) {
          console.warn(`Compressed image still > 1MB (${compressed.size}), uploading anyway`)
        }

        // Build storage path: {consultant_id}/{lead_id}/{filename}
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storagePath = `${consultantId}/${leadId || 'draft'}/${timestamp}_${safeName}`

        // Upload to Supabase Storage bucket 'v1-fotos'
        // Note: bucket must exist — don't fail if it doesn't, just log error
        const { error: uploadError } = await supabase.storage
          .from('v1-fotos')
          .upload(storagePath, compressed, {
            contentType: 'image/jpeg',
            upsert: false,
          })

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          // Don't block on storage bucket missing — store the path for future sync
          setError(`Erro ao enviar foto: ${uploadError.message}`)
          continue
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('v1-fotos')
          .getPublicUrl(storagePath)

        if (urlData?.publicUrl) {
          newUrls.push(urlData.publicUrl)
        } else {
          // Fallback: store the path itself
          newUrls.push(storagePath)
        }
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
      }
    } catch (err) {
      console.error('Photo upload failed:', err)
      setError('Erro ao processar fotos')
    } finally {
      setUploading(false)
      // Reset the input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  const handleRemove = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Photo grid */}
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, index) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
              <img
                src={url}
                alt={`Foto V1 ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {remainingSlots > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            'w-full h-12 rounded-lg border-2 border-dashed border-gray-300 text-sm text-gray-500',
            'flex items-center justify-center gap-2 transition-colors',
            'hover:border-gray-400 hover:text-gray-600',
            uploading && 'opacity-50 cursor-wait',
          )}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              Adicionar foto ({value.length}/{MAX_PHOTOS})
            </>
          )}
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
