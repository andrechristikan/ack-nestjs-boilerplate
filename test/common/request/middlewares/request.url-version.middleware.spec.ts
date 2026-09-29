import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Response } from 'express';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { RequestVersionStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';

describe('RequestUrlVersionMiddleware', () => {
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let res: Response;
    let next: NextFunction;

    const buildMiddleware = async (
        urlVersionEnable: boolean
    ): Promise<RequestUrlVersionMiddleware> => {
        const configGet = vi.fn<(key: string) => string | boolean>();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, string | boolean> = {
                'app.globalPrefix': '/api',
                'app.urlVersion.enable': urlVersionEnable,
                'app.urlVersion.prefix': 'v',
                'app.urlVersion.version': '1',
            };
            return values[key];
        });
        const configService: MockProxy<ConfigService> = mock<ConfigService>({
            get: configGet as ConfigService['get'],
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestUrlVersionMiddleware,
                { provide: ConfigService, useValue: configService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        return module.get(RequestUrlVersionMiddleware);
    };

    beforeEach(() => {
        vi.resetAllMocks();

        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('extracts the version segment from the URL when versioning is enabled and the prefix matches', async () => {
            const middleware = await buildMiddleware(true);
            const req = {
                originalUrl: '/api/v2/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '2'
            );
            expect(next).toHaveBeenCalledTimes(1);
        });

        it('defaults to the configured version when versioning is disabled', async () => {
            const middleware = await buildMiddleware(false);
            const req = {
                originalUrl: '/api/v2/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
        });

        it('defaults to the configured version when the URL does not carry the version prefix', async () => {
            const middleware = await buildMiddleware(true);
            const req = {
                originalUrl: '/api/users',
            } as unknown as IRequestApp;

            await middleware.use(req, res, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
        });
    });
});
