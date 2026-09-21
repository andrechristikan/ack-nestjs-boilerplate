import { CACHE_KEY_METADATA } from '@nestjs/cache-manager';
import type { CallHandler, ExecutionContext, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';
import { firstValueFrom, of } from 'rxjs';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';

describe('ResponseCacheInterceptor', () => {
    const cache: MockProxy<Cache> = mock<Cache>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>();
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const cacheGet = vi.mocked(cache.get);
    const configGet = vi.mocked(configService.get);
    const handler = vi.fn();
    const controller = {} as Type<unknown>;
    let context: MockProxy<ExecutionContext>;

    let interceptor: ResponseCacheInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        context = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(handler);
        context.getClass.mockReturnValue(controller);
        configGet.mockReturnValue('Apis:{key}');

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseCacheInterceptor,
                { provide: CacheMainProvider, useValue: cache },
                { provide: ConfigService, useValue: configService },
                { provide: Reflector, useValue: reflector },
                {
                    provide: HttpAdapterHost,
                    useValue: { httpAdapter: undefined },
                },
            ],
        }).compile();

        interceptor = moduleRef.get(ResponseCacheInterceptor);
    });

    it('prefixes the route cache key before reading a cached response', async () => {
        const cached = { data: { id: 'user-id' } };
        reflector.get.mockImplementation(key =>
            key === CACHE_KEY_METADATA ? 'user-detail' : undefined
        );
        cacheGet.mockResolvedValue(cached);
        const next = { handle: vi.fn(() => of('fresh')) } satisfies CallHandler;

        const result = await firstValueFrom(
            await interceptor.intercept(context, next)
        );

        expect(cacheGet).toHaveBeenCalledWith('Apis:user-detail');
        expect(result).toBe(cached);
        expect(next.handle).not.toHaveBeenCalled();
    });

    it('delegates without cache access when the framework has no cache key', async () => {
        reflector.get.mockReturnValue(undefined);
        const next = { handle: vi.fn(() => of('fresh')) } satisfies CallHandler;

        await expect(
            firstValueFrom(await interceptor.intercept(context, next))
        ).resolves.toBe('fresh');
        expect(cacheGet).not.toHaveBeenCalled();
    });
});
