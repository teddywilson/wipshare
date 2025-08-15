import { Storage } from '@google-cloud/storage'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || 'wipshare-prod-1754907075',
})

const bucketName = process.env.GCP_STORAGE_BUCKET || process.env.GCS_BUCKET_NAME || 'wipshare-tracks-stg'
const bucket = storage.bucket(bucketName)

// Audio file filter
const audioFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const audioMimeTypes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/flac',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/x-m4a',
    'audio/mp4',
    'audio/x-aiff',
    'audio/aiff',
    'application/octet-stream', // Sometimes used for audio files
  ]
  
  // Also check file extension as a fallback
  const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a', '.mp4', '.aiff', '.webm']
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
  
  if (audioMimeTypes.includes(file.mimetype) || audioExtensions.includes(fileExtension)) {
    cb(null, true)
  } else {
    cb(new Error('Only audio files are allowed'))
  }
}

// Image file filter
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const imageMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ]
  
  if (imageMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'))
  }
}

// Mixed file filter (allows both audio and images)
const mixedFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    // Audio types
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/flac',
    'audio/aac',
    'audio/ogg',
    'audio/webm',
    'audio/x-m4a',
    'audio/mp4',
    'audio/x-aiff',
    'audio/aiff',
    'application/octet-stream',
    // Image types
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ]
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only audio and image files are allowed'))
  }
}

// Configure multer instances
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: mixedFileFilter,
})

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: audioFileFilter,
})

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for images
  },
  fileFilter: imageFileFilter,
})

export async function uploadToGCS(
  file: Express.Multer.File,
  userId: string,
  trackId: string
): Promise<string> {
  const fileName = `tracks/${userId}/${trackId}/${uuidv4()}${path.extname(file.originalname)}`
  const blob = bucket.file(fileName)
  
  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
      metadata: {
        userId,
        trackId,
        originalName: file.originalname,
      },
    },
  })
  
  return new Promise((resolve, reject) => {
    blobStream.on('error', (err) => {
      reject(err)
    })
    
    blobStream.on('finish', async () => {
      // Make the file publicly accessible
      await blob.makePublic()
      
      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`
      resolve(publicUrl)
    })
    
    blobStream.end(file.buffer)
  })
}

export async function deleteFromGCS(fileUrl: string): Promise<void> {
  try {
    const fileName = fileUrl.replace(`https://storage.googleapis.com/${bucketName}/`, '')
    await bucket.file(fileName).delete()
  } catch (error) {
    console.error('Error deleting file from GCS:', error)
    throw error
  }
}

export async function downloadFromGCS(fileUrl: string): Promise<Buffer> {
  try {
    const fileName = fileUrl.replace(`https://storage.googleapis.com/${bucketName}/`, '')
    const [buffer] = await bucket.file(fileName).download()
    return buffer
  } catch (error) {
    console.error('Error downloading file from GCS:', error)
    throw error
  }
}

export async function generateSignedUrl(
  fileUrl: string,
  expirationMinutes: number = 60
): Promise<string> {
  try {
    const fileName = fileUrl.replace(`https://storage.googleapis.com/${bucketName}/`, '')
    const [url] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expirationMinutes * 60 * 1000,
    })
    return url
  } catch (error: any) {
    // If we can't generate signed URLs (missing credentials), return the public URL
    // This works if the files are publicly accessible
    if (error.message?.includes('client_email')) {
      console.warn('Cannot generate signed URL - returning public URL instead')
      return fileUrl
    }
    console.error('Error generating signed URL:', error)
    throw error
  }
}