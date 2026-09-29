import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { RequestHelmetMiddleware } from '@common/request/middlewares/request.helmet.middleware';

vi.mock('helmet', () => ({
    default: vi.fn(),
}));

describe('RequestHelmetMiddleware', () => {
    const configGet = vi.fn<(key: string) => number | boolean | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let middleware: RequestHelmetMiddleware;
    let req: Request;
    let res: Response;
    let next: NextFunction;
    let handler: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.resetAllMocks();

        configGet.mockImplementation((key: string) => {
            const values: Record<string, number | boolean> = {
                'request.helmet.maxAgeInSeconds': 31536000,
                'request.helmet.includeSubDomains': true,
                'request.helmet.preload': true,
            };
            return values[key];
        });

        handler = vi.fn();
        (helmet as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
            handler
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestHelmetMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        middleware = module.get(RequestHelmetMiddleware);

        req = {} as Request;
        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('applies the non-documents helmet profile using configured HSTS values', () => {
            middleware.use(req, res, next);

            expect(helmet).toHaveBeenCalledWith(
                expect.objectContaining({
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
                        preload: true,
                    },
                    xContentTypeOptions: true,
                    xDownloadOptions: true,
                    xFrameOptions: { action: 'deny' },
                    xPermittedCrossDomainPolicies: {
                        permittedPolicies: 'none',
                    },
                    xPoweredBy: false,
                })
            );
            expect(handler).toHaveBeenCalledWith(req, res, next);
        });
    });
});
