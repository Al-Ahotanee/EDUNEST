import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check endpoint for Render and uptime monitoring' })
  check() {
    return {
      status: 'ok',
      service: 'EduNest Institutional OS API',
      timestamp: new Date().toISOString(),
      version: '2.4',
    };
  }
}
