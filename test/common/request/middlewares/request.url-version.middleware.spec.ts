import { createMock } from '@golevelup/ts-vitest';
import { ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestVersionStoreKey } from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUrlVersionMiddleware } from '@common/request/middlewares/request.url-version.middleware';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RequestUrlVersionMiddleware', () => {
    const configService: Pick<ConfigService, 'get'> = { get: vi.fn() };
    const configGet = vi.mocked(configService.get);
    const requestStoreService: Pick<RequestStoreService, 'set'> = {
        set: vi.fn(),
    };
    const requestStoreSet = vi.mocked(requestStoreService.set);
    const next = vi.fn<() => void>();

    async function createMiddleware(enabled: boolean) {
        configGet.mockImplementation(key => {
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
        const request = createMock<IRequestApp>({
            originalUrl: '/api/v2/users',
        });

        await middleware.use(request, createMock<Response>(), next);

        expect(requestStoreSet).toHaveBeenCalledWith(
            RequestVersionStoreKey,
            '2'
        );
    });

    it.each([false, true])(
        'uses the configured version when enable is %s and no version matches',
        async enabled => {
            const middleware = await createMiddleware(enabled);
            const request = createMock<IRequestApp>({ originalUrl: '/health' });

            await middleware.use(request, createMock<Response>(), next);

            expect(requestStoreSet).toHaveBeenCalledWith(
                RequestVersionStoreKey,
                '1'
            );
            expect(next).toHaveBeenCalledTimes(1);
        }
    );
});
