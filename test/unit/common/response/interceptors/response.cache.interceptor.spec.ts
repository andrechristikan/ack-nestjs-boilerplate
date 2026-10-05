import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { CacheInterceptor as CacheBaseInterceptor } from '@nestjs/cache-manager';
import type { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Cache } from 'cache-manager';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { CacheMainProvider } from '@common/cache/constants/cache.constant';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';

describe('ResponseCacheInterceptor', () => {
    const cache: MockProxy<Cache> = mock<Cache>();
    const configGet = vi.fn<(key: string) => string | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();

    let interceptor: ResponseCacheInterceptor;

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockReturnValue('response:cache:{key}');

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResponseCacheInterceptor,
                { provide: CacheMainProvider, useValue: cache },
                { provide: ConfigService, useValue: configService },
                { provide: Reflector, useValue: reflector },
            ],
        }).compile();

        interceptor = module.get(ResponseCacheInterceptor);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('trackBy', () => {
        it('returns undefined when the base interceptor tracks no key', () => {
            vi.spyOn(CacheBaseInterceptor.prototype, 'trackBy').mockReturnValue(
                undefined
            );

            const result = interceptor['trackBy'](context);

            expect(result).toBeUndefined();
        });

        it('returns undefined when the base interceptor tracks a non-string key', () => {
            vi.spyOn(CacheBaseInterceptor.prototype, 'trackBy').mockReturnValue(
                123 as unknown as string
            );

            const result = interceptor['trackBy'](context);

            expect(result).toBeUndefined();
        });

        it('namespaces a string key with the configured key pattern', () => {
            vi.spyOn(CacheBaseInterceptor.prototype, 'trackBy').mockReturnValue(
                'GET:/users'
            );

            const result = interceptor['trackBy'](context);

            expect(result).toBe('response:cache:GET:/users');
        });
    });
});
