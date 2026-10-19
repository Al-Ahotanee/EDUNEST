import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

interface CachedTenantContext {
  tenant: any;
  school: any;
  expiresAt: number;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private cache = new Map<string, CachedTenantContext>();
  private readonly CACHE_TTL_MS = 60 * 1000; // 60 seconds

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      let identifierType: 'slug' | 'domain' | 'id' | null = null;
      let identifierValue: string | null = null;

      // 1. Check explicit request headers
      const headerSlug = req.headers['x-tenant-slug'] as string;
      const headerTenantId = req.headers['x-tenant-id'] as string;

      if (headerSlug) {
        identifierType = 'slug';
        identifierValue = headerSlug.trim().toLowerCase();
      } else if (headerTenantId) {
        identifierType = 'id';
        identifierValue = headerTenantId.trim();
      }

      // 2. Check Host header for subdomain or custom domain (if not identified yet)
      if (!identifierValue && req.headers.host) {
        const rawHost = req.headers.host.split(':')[0].toLowerCase(); // Strip port
        const parts = rawHost.split('.');

        // Subdomain check: e.g. "crawford.edunest.ng" or "demo.localhost"
        if (parts.length >= 2) {
          const firstPart = parts[0];
          const isLocalhost = parts.includes('localhost');
          const isStandardRoot = ['www', 'api', 'app', 'admin', 'portal', 'mail'].includes(firstPart);

          if (!isStandardRoot) {
            if (isLocalhost && parts.length === 2 && firstPart !== 'localhost') {
              // e.g. "demo.localhost"
              identifierType = 'slug';
              identifierValue = firstPart;
            } else if (parts.length >= 3) {
              // e.g. "crawford.edunest.ng"
              identifierType = 'slug';
              identifierValue = firstPart;
            }
          }
        }

        // Custom domain check (if not a platform subdomain)
        if (!identifierValue && !rawHost.includes('edunest') && !rawHost.includes('localhost') && rawHost !== '127.0.0.1') {
          identifierType = 'domain';
          identifierValue = rawHost;
        }
      }

      // 3. Resolve and cache if an identifier was found
      if (identifierType && identifierValue) {
        const cacheKey = `${identifierType}:${identifierValue}`;
        const cached = this.cache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
          (req as any).tenant = cached.tenant;
          (req as any).school = cached.school;
          (req as any).tenantId = cached.tenant?.id;
          (req as any).schoolId = cached.school?.id;
        } else {
          let tenant: any = null;

          if (identifierType === 'slug') {
            tenant = await this.prisma.tenant.findUnique({
              where: { slug: identifierValue },
              include: { schools: { where: { isActive: true }, take: 1 } },
            });
          } else if (identifierType === 'domain') {
            tenant = await this.prisma.tenant.findUnique({
              where: { domain: identifierValue },
              include: { schools: { where: { isActive: true }, take: 1 } },
            });
          } else if (identifierType === 'id') {
            tenant = await this.prisma.tenant.findUnique({
              where: { id: identifierValue },
              include: { schools: { where: { isActive: true }, take: 1 } },
            });
          }

          if (tenant) {
            const school = tenant.schools?.[0] || null;
            this.cache.set(cacheKey, {
              tenant,
              school,
              expiresAt: Date.now() + this.CACHE_TTL_MS,
            });

            (req as any).tenant = tenant;
            (req as any).school = school;
            (req as any).tenantId = tenant.id;
            (req as any).schoolId = school?.id;
          }
        }
      }
    } catch {
      // Non-fatal: continue middleware chain even if resolution fails
    }

    next();
  }
}