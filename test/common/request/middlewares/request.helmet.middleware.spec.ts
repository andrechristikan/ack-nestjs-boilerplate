import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';
import { ConfigService } from '@nestjs/config';

vi.mock('helmet', () => ({ default: vi.fn(() => vi.fn()) }));

describe('RequestHelmetMiddleware', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const request: MockProxy<Request> = mock<Request>();
    const response: MockProxy<Response> = mock<Response>();
    const next: NextFunction = () => undefined;
    const helmetMiddleware = vi.fn();
    const helmetMock = vi.mocked(helmet);

    let middleware: RequestHelmetMiddleware;

    beforeEach(async () => {
        vi.resetAllMocks();
        helmetMock.mockReturnValue(helmetMiddleware);
        vi.mocked(configService.get).mockImplementation(key => {
            if (key === 'request.helmet.maxAgeInSeconds') return 31536000;
            if (key === 'request.helmet.includeSubDomains') return true;
            if (key === 'request.helmet.preload') return false;
            return undefined;
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestHelmetMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();
        middleware = moduleRef.get(RequestHelmetMiddleware);
    });

    it('applies the configured API security-header profile', () => {
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
