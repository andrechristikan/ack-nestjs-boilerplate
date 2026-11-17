import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import {
    RequestHelmetCacheControlHeaderName,
    RequestHelmetCacheControlHeaderValue,
    RequestHelmetCspDirectives,
} from '@common/request/constants/request.constant';

@Injectable()
export class RequestHelmetMiddleware implements NestMiddleware {
    private readonly maxAgeInSeconds: number;
    private readonly includeSubDomainsEnabled: boolean;
    private readonly preloadEnabled: boolean;

    constructor(private readonly configService: ConfigService) {
        this.maxAgeInSeconds = this.configService.get<number>(
            'request.helmet.maxAgeInSeconds'
        )!;
        this.includeSubDomainsEnabled = this.configService.get<boolean>(
            'request.helmet.includeSubDomainsEnabled'
        )!;
        this.preloadEnabled = this.configService.get<boolean>(
            'request.helmet.preloadEnabled'
        )!;
    }

    use(req: Request, res: Response, next: NextFunction): void {
        res.setHeader(
            RequestHelmetCacheControlHeaderName,
            RequestHelmetCacheControlHeaderValue
        );
        helmet({
            contentSecurityPolicy: {
                useDefaults: false,
                directives: RequestHelmetCspDirectives,
            },
            crossOriginOpenerPolicy: false,
            originAgentCluster: false,
            referrerPolicy: { policy: 'no-referrer' },
            xDnsPrefetchControl: false,
            xXssProtection: false,
            crossOriginResourcePolicy: { policy: 'same-origin' },
            strictTransportSecurity: {
                maxAge: this.maxAgeInSeconds,
                includeSubDomains: this.includeSubDomainsEnabled,
                preload: this.preloadEnabled,
            },
            xContentTypeOptions: true,
            xDownloadOptions: true,
            xFrameOptions: { action: 'deny' },
            xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
            xPoweredBy: false,
        })(req, res, next);
    }
}
