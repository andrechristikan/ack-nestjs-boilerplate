import { ExecutionContext } from '@nestjs/common';
import { CACHE_KEY_METADATA } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Cache } from 'cache-manager';
import { ResponseCacheInterceptor } from '@common/response/interceptors/response.cache.interceptor';

type TrackByHost = {
    trackBy: (context: ExecutionContext) => string | undefined;
};

describe('ResponseCacheInterceptor', () => {
    let interceptor: ResponseCacheInterceptor;
    let configService: jest.Mocked<ConfigService>;
    let reflector: jest.Mocked<Reflector>;
    let cache: jest.Mocked<Cache>;
    let context: jest.Mocked<ExecutionContext>;

    beforeEach(() => {
        cache = {
            get: jest.fn(),
            set: jest.fn(),
        } as unknown as jest.Mocked<Cache>;

        configService = {
            get: jest.fn().mockReturnValue('Apis:{key}'),
        } as unknown as jest.Mocked<ConfigService>;

        reflector = {
            get: jest.fn(),
        } as unknown as jest.Mocked<Reflector>;

        context = {
            getHandler: jest.fn(),
            getClass: jest.fn(),
            getArgByIndex: jest.fn(),
            switchToHttp: jest.fn(),
        } as unknown as jest.Mocked<ExecutionContext>;

        interceptor = new ResponseCacheInterceptor(cache, configService, reflector);
        (interceptor as unknown as { httpAdapterHost: unknown }).httpAdapterHost = {
            httpAdapter: undefined,
        };
    });

    it('should read the key pattern from response.keyPattern', () => {
        expect(configService.get).toHaveBeenCalledWith('response.keyPattern');
    });

    it('should build the cache key from response.keyPattern when a base key is present', () => {
        reflector.get.mockReturnValue('user.list');

        const result = (interceptor as unknown as TrackByHost).trackBy(context);

        expect(reflector.get).toHaveBeenCalledWith(
            CACHE_KEY_METADATA,
            context.getHandler()
        );
        expect(result).toBe('Apis:user.list');
    });

    it('should return undefined when no base key is present', () => {
        reflector.get.mockReturnValue(undefined);

        const result = (interceptor as unknown as TrackByHost).trackBy(context);

        expect(result).toBeUndefined();
    });
});
