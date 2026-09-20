import { createMock } from '@golevelup/ts-vitest';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';
import { ConfigService } from '@nestjs/config';

vi.mock('helmet', () => ({ default: vi.fn(() => vi.fn()) }));

describe('RequestHelmetMiddleware', () => {
    const configService = createMock<ConfigService>();
    const request = createMock<Request>();
    const response = createMock<Response>();
    const next: NextFunction = () => undefined;
    const helmetMiddleware = vi.fn();
    const helmetMock = vi.mocked(helmet);

    beforeEach(() => {
        vi.resetAllMocks();
        helmetMock.mockReturnValue(helmetMiddleware);
        configService.get.mockImplementation(key => {
            if (key === 'request.helmet.maxAgeInSeconds') return 31536000;
            if (key === 'request.helmet.includeSubDomains') return true;
            if (key === 'request.helmet.preload') return false;
            return undefined;
        });
    });

    it('applies the configured API security-header profile', () => {
        const middleware = new RequestHelmetMiddleware(configService);
        middleware.use(request, response, next);
        expect(helmetMock).toHaveBeenCalledWith({
            contentSecurityPolicy: false,
            crossOriginOpenerPolicy: false,
            originAgentCluster: false,
            referrerPolicy: false,
            xDnsPrefetchControl: false,
            xXssProtection: false,
            crossOriginResourcePolicy: { policy: 'same-origin' },
            strictTransportSecurity: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: false,
            },
            xContentTypeOptions: true,
            xDownloadOptions: true,
            xFrameOptions: { action: 'deny' },
            xPermittedCrossDomainPolicies: { permittedPolicies: 'none' },
            xPoweredBy: false,
        });
        expect(helmetMiddleware).toHaveBeenCalledWith(request, response, next);
    });
});
