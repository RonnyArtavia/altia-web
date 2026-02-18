import { useState } from 'react'

interface UploadResult {
  url: string
  path: string
}

interface UseFileUploadOptions {
  folder?: string
  onSuccess?: (result: UploadResult) => void
  onError?: (error: Error) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File, filename?: string): Promise<UploadResult | null> => {
    try {
      setIsUploading(true)
      setError(null)
      setUploadProgress(0)

      // Validar el archivo
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (file.size > maxSize) {
        throw new Error('El archivo es demasiado grande. Máximo 10MB permitido.')
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Tipo de archivo no permitido. Solo se permiten imágenes y documentos PDF.')
      }

      // Simular upload (para desarrollo)
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generar nombre único para el archivo
      const timestamp = Date.now()
      const fileExtension = file.name.split('.').pop()
      const fileName = filename || `${timestamp}.${fileExtension}`

      // Crear ruta del archivo
      const folder = options.folder || 'uploads'
      const filePath = `${folder}/${fileName}`

      // Simular URL de descarga
      const downloadURL = URL.createObjectURL(file)

      const result: UploadResult = {
        url: downloadURL,
        path: filePath
      }

      setUploadProgress(100)
      options.onSuccess?.(result)

      return result

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al subir archivo')
      console.error('Error uploading file:', error)
      setError(error.message)
      options.onError?.(error)

      return null
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const deleteFile = async (filePath: string): Promise<boolean> => {
    try {
      // Simular delete
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error al eliminar archivo')
      console.error('Error deleting file:', error)
      setError(error.message)
      return false
    }
  }

  return {
    uploadFile,
    deleteFile,
    isUploading,
    uploadProgress,
    error,
    clearError: () => setError(null)
  }
}