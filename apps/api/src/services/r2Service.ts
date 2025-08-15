import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

class R2Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      endpoint: process.env.R2_ENDPOINT!,
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    
    this.bucket = process.env.R2_BUCKET!;
  }

  async getPresignedUploadUrl(userId: string, filename: string, isPublic: boolean = false) {
    const date = new Date();
    const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
    const uuid = uuidv4();
    const prefix = isPublic ? 'public' : 'private';
    const key = `${prefix}/${userId}/${yearMonth}/${uuid}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    
    return {
      url,
      key,
    };
  }

  async getPresignedDownloadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn: 3600 });
    return url;
  }

  async deleteObject(key: string) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
  }
}

export const r2Service = new R2Service();