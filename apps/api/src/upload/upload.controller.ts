import {
  Controller, Post, Body, UseInterceptors, UploadedFile, Req, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Public()
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file via multipart/form-data' })
  @ApiConsumes('multipart/form-data')
  async uploadMultipart(@UploadedFile() file: any, @Req() req: any) {
    if (!file) throw new BadRequestException('No file provided');
    const result = await this.uploadService.saveMultipartFile(file, 'images');
    return {
      success: true,
      data: result,
      message: 'File uploaded successfully',
    };
  }

  @Public()
  @Post('image')
  @ApiOperation({ summary: 'Upload image via base64 or JSON payload' })
  async uploadImage(@Body() body: { data?: string; image?: string; file?: string; filename?: string; folder?: string }) {
    const rawData = body.data || body.image || body.file;
    if (!rawData) {
      throw new BadRequestException('Field "data" containing base64 image is required');
    }
    const folder = body.folder || 'images';
    const result = await this.uploadService.saveBase64(rawData, body.filename, folder);
    return {
      success: true,
      data: result,
      message: 'Image uploaded successfully',
    };
  }

  @Public()
  @Post('logo')
  @ApiOperation({ summary: 'Upload school logo via base64' })
  async uploadLogo(@Body() body: { data?: string; image?: string; file?: string; filename?: string }) {
    const rawData = body.data || body.image || body.file;
    if (!rawData) throw new BadRequestException('Field "data" containing base64 logo is required');
    const result = await this.uploadService.saveBase64(rawData, body.filename, 'logos');
    return {
      success: true,
      data: result,
      message: 'Logo uploaded successfully',
    };
  }

  @Public()
  @Post('document')
  @ApiOperation({ summary: 'Upload document via base64' })
  async uploadDocument(@Body() body: { data?: string; file?: string; filename?: string }) {
    const rawData = body.data || body.file;
    if (!rawData) throw new BadRequestException('Field "data" containing base64 document is required');
    const result = await this.uploadService.saveBase64(rawData, body.filename, 'documents');
    return {
      success: true,
      data: result,
      message: 'Document uploaded successfully',
    };
  }
}
