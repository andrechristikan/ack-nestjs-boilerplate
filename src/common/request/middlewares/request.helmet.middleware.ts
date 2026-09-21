import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';

/**
 * Applies the non-documents Helmet profile to every request.
 */
@Injectable()
export class RequestHelmetMiddleware implements NestMiddleware {
    constructor(private readonly configService: ConfigService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const maxAgeInSeconds = this.configService.get<number>(
            'request.helmet.maxAgeInSeconds'
        )!;
        const includeSubDomains = this.configService.get<boolean>(
            'request.helmet.includeSubDomains'
        )!;
        const preload = this.configService.get<boolean>(
            'request.helmet.preload'
        )!;

        helmet({
            contentSecurityPolicy: false,
            crossOriginOpenerPolicy: false,
            originAgentCluster: false,
            referrerPolicy: false,
            xDnsPrefetchControl: false,
            xXssProtection: false,
            crossOriginResourcePolicy: { policy: 'same-origin' },
            strictTransportSecurity: {
                maxAge: maxAgeInSeconds,
                includeSubDomains,
                preload,
            },
            xContentTypeOptions: true,
            xDownloadOptions: true,
            xFrameOptions: { action: 'deny' },
            xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
            xPoweredBy: false,
        })(req, res, next);
    }
}
