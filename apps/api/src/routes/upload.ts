import { Router } from 'express';
import { requireAuth } from '../middleware/clerk-auth';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
});

const bucketName = process.env.GCS_BUCKET_NAME || 'wipshare-tracks-stg';
const bucket = storage.bucket(bucketName);

// Generate signed URL for direct upload to GCS
router.post('/generate-upload-url', requireAuth, async (req, res): Promise<any> => {
  try {
    const { filename, contentType, fileSize } = req.body;
    
    if (!filename || !contentType) {
      return res.status(400).json({ error: 'Missing filename or contentType' });
    }

    // Check file size (allow up to 500MB)
    if (fileSize && fileSize > 500 * 1024 * 1024) {
      return res.status(400).json({ error: 'File size exceeds 500MB limit' });
    }

    // Generate unique file path
    const userId = req.user?.id || 'anonymous';
    const fileId = uuidv4();
    const extension = filename.split('.').pop();
    const gcsFileName = `tracks/${userId}/${fileId}/${fileId}.${extension}`;

    // Generate a v4 signed URL for uploading
    const [url] = await bucket.file(gcsFileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
      contentType,
      extensionHeaders: {
        'x-goog-content-length-range': '0,524288000', // 0-500MB
      },
    });

    // Return the signed URL and file info
    res.json({
      uploadUrl: url,
      fileName: gcsFileName,
      fileId,
      publicUrl: `https://storage.googleapis.com/${bucketName}/${gcsFileName}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export const uploadRouter = router;