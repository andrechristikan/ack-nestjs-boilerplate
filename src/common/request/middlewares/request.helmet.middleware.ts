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
    private readonly maxAgeInSeconds: number;
    private readonly includeSubDomains: boolean;
    private readonly preload: boolean;

    constructor(private readonly configService: ConfigService) {
        this.maxAgeInSeconds = this.configService.get<number>(
            'request.helmet.maxAgeInSeconds'
        )!;
        this.includeSubDomains = this.configService.get<boolean>(
            'request.helmet.includeSubDomains'
        )!;
        this.preload = this.configService.get<boolean>(
            'request.helmet.preload'
        )!;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        helmet({
            contentSecurityPolicy: false,
            crossOriginOpenerPolicy: false,
            originAgentCluster: false,
            referrerPolicy: false,
            xDnsPrefetchControl: false,
            xXssProtection: false,
            crossOriginResourcePolicy: { policy: 'same-origin' },
            strictTransportSecurity: {
                maxAge: this.maxAgeInSeconds,
                includeSubDomains: this.includeSubDomains,
                preload: this.preload,
            },
            xContentTypeOptions: true,
            xDownloadOptions: true,
            xFrameOptions: { action: 'deny' },
            xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
            xPoweredBy: false,
        })(req, res, next);
    }
}
