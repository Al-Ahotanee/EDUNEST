import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadsRoot = join(process.cwd(), 'uploads');

  constructor() {
    this.ensureDirectoryExists(this.uploadsRoot);
    this.ensureDirectoryExists(join(this.uploadsRoot, 'images'));
    this.ensureDirectoryExists(join(this.uploadsRoot, 'logos'));
    this.ensureDirectoryExists(join(this.uploadsRoot, 'documents'));
  }

  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Save a base64 Data URL or raw base64 string to uploads directory
   */
  async saveBase64(base64Data: string, originalName?: string, folder = 'images'): Promise<{ url: string; path: string; size: number }> {
    if (!base64Data) {
      throw new BadRequestException('No image data provided');
    }

    const targetFolder = join(this.uploadsRoot, folder);
    this.ensureDirectoryExists(targetFolder);

    let mimeType = 'image/png';
    let rawBase64 = base64Data;
    let ext = '.png';

    // Parse Data URL if prefixed: data:image/jpeg;base64,...
    const matches = base64Data.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      rawBase64 = matches[2];

      if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = '.jpg';
      else if (mimeType.includes('png')) ext = '.png';
      else if (mimeType.includes('webp')) ext = '.webp';
      else if (mimeType.includes('svg')) ext = '.svg';
      else if (mimeType.includes('gif')) ext = '.gif';
      else if (mimeType.includes('pdf')) ext = '.pdf';
    } else if (originalName) {
      const detectedExt = extname(originalName).toLowerCase();
      if (detectedExt) ext = detectedExt;
    }

    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const filePath = join(targetFolder, filename);

    const buffer = Buffer.from(rawBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const relativeUrl = `/uploads/${folder}/${filename}`;

    return {
      url: relativeUrl,
      path: relativeUrl,
      size: buffer.length,
    };
  }

  /**
   * Save a file from multipart upload (multer)
   */
  async saveMultipartFile(file: any, folder = 'images'): Promise<{ url: string; path: string; size: number }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const targetFolder = join(this.uploadsRoot, folder);
    this.ensureDirectoryExists(targetFolder);

    const ext = extname(file.originalname || '').toLowerCase() || '.png';
    const filename = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    const filePath = join(targetFolder, filename);

    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
    }

    const relativeUrl = `/uploads/${folder}/${filename}`;

    return {
      url: relativeUrl,
      path: relativeUrl,
      size: file.size || (file.buffer ? file.buffer.length : 0),
    };
  }
}
