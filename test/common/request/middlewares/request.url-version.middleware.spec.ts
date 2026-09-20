import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestVersionStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestUrlVersionMiddleware', () => {
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const response: MockProxy<Response> = mock<Response>();
    const next = vi.fn<() => void>();

    async function createMiddleware(enabled: boolean) {
        vi.mocked(configService.get).mockImplementation(key => {
            const values: Record<string, unknown> = {
                'app.globalPrefix': '/api',
                'app.urlVersion.enable': enabled,
                'app.urlVersion.prefix': 'v',
                'app.urlVersion.version': '1',
            };
            return values[key];
        });
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RequestUrlVersionMiddleware,
                { provide: ConfigService, useValue: configService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        return moduleRef.get(RequestUrlVersionMiddleware);
    }

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('extracts the version from a versioned API URL', async () => {
        const middleware = await createMiddleware(true);
        const request: MockProxy<IRequestApp> = mock<IRequestApp>({
            originalUrl: '/api/v2/users',
        });

        await middleware.use(request, response, next);

        expect(requestStoreService.set).toHaveBeenCalledWith(
            RequestVersionStoreKey,
            '2'
        );
    });

    it.each([false, true])(
        'uses the configured version when enable is %s and no version matches',
        async enabled => {
            const middleware = await createMiddleware(enabled);
            const request: MockProxy<IRequestApp> = mock<IRequestApp>({
                originalUrl: '/health',
            });

            await middleware.use(request, response, next);

            expect(requestStoreService.set).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
            expect(next).toHaveBeenCalledTimes(1);
        }
    );
});
