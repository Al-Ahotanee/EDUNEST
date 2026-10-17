import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class PingController {
  @Public()
  @Get('ping')
  @ApiOperation({ summary: 'Uptime and health check probe for Render and load balancers' })
  ping() {
    return {
      status: 'ok',
      service: 'EduNest Institutional OS API',
      timestamp: new Date().toISOString(),
      version: '2.4',
    };
  }

  @Public()
  @Get('health-check')
  @ApiOperation({ summary: 'Alternative system health check probe' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'EduNest Institutional OS API',
      timestamp: new Date().toISOString(),
      version: '2.4',
    };
  }
}

