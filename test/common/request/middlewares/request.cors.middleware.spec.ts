import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import type { CorsOptions } from 'cors';
import { RequestCorsMiddleware } from '@common/request/middlewares/request.cors.middleware';

vi.mock('cors', () => ({
    default: vi.fn(),
}));

interface ICorsConfig {
    allowedOrigin: string | boolean | string[];
    allowedMethod: string[];
    allowedHeader: string[];
    exposedHeader: string[];
}

describe('RequestCorsMiddleware', () => {
    let req: Request;
    let res: Response;
    let next: NextFunction;
    let handler: ReturnType<typeof vi.fn>;
    let capturedOptions: CorsOptions;

    const buildMiddleware = async (
        config: ICorsConfig
    ): Promise<RequestCorsMiddleware> => {
        const configGet = vi.fn<(key: string) => unknown>();
        configGet.mockImplementation((key: string) => {
            const values: Record<string, unknown> = {
                'request.cors.allowedOrigin': config.allowedOrigin,
                'request.cors.allowedMethod': config.allowedMethod,
                'request.cors.allowedHeader': config.allowedHeader,
                'request.cors.exposedHeader': config.exposedHeader,
            };
            return values[key];
        });
        const configService: MockProxy<ConfigService> = mock<ConfigService>({
            get: configGet as ConfigService['get'],
        });

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RequestCorsMiddleware,
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        return module.get(RequestCorsMiddleware);
    };

    beforeEach(() => {
        vi.resetAllMocks();

        handler = vi.fn();
        capturedOptions = {} as CorsOptions;
        vi.mocked(cors).mockImplementation(options => {
            capturedOptions = options as CorsOptions;
            return handler as unknown as ReturnType<typeof cors>;
        });

        req = {} as Request;
        res = {} as Response;
        next = vi.fn();
    });

    describe('use', () => {
        it('applies cors with the configured options and delegates to the handler', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: ['https://example.com'],
                allowedMethod: ['GET', 'POST'],
                allowedHeader: ['content-type'],
                exposedHeader: ['x-request-id'],
            });

            middleware.use(req, res, next);

            expect(capturedOptions).toMatchObject({
                methods: ['GET', 'POST'],
                allowedHeaders: ['content-type'],
                exposedHeaders: ['x-request-id'],
                preflightContinue: false,
                credentials: true,
                optionsSuccessStatus: HttpStatus.NO_CONTENT,
                maxAge: 86400,
            });
            expect(typeof capturedOptions.origin).toBe('function');
            expect(handler).toHaveBeenCalledWith(req, res, next);
        });

        it('disables credentials for a wildcard string origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: '*',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            middleware.use(req, res, next);

            expect(capturedOptions.credentials).toBe(false);
        });

        it('allows any origin when the origin function is invoked with no origin header', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: '*',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            middleware.use(req, res, next);

            const originFn = capturedOptions.origin as (
                origin: string | undefined,
                callback: (err: Error | null, allow?: boolean) => void
            ) => void;
            const callback = vi.fn();

            originFn(undefined, callback);

            expect(callback).toHaveBeenCalledWith(null, true);
        });
    });

    describe('originValidator', () => {
        it('allows a missing origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: false,
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator'](undefined, callback);

            expect(callback).toHaveBeenCalledWith(null, true);
        });

        it('answers a boolean allowedOrigin directly', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: false,
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://example.com', callback);

            expect(callback).toHaveBeenCalledWith(null, false);
        });

        it('allows every origin for a wildcard string', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: '*',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://example.com', callback);

            expect(callback).toHaveBeenCalledWith(null, true);
        });

        it('checks a non-wildcard string allowedOrigin against the origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: 'example.com',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://example.com', callback);

            expect(callback).toHaveBeenCalledWith(null, true);
        });

        it('rejects an origin not matching a non-wildcard string allowedOrigin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: 'example.com',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://other.com', callback);

            expect(callback).toHaveBeenCalledWith(null, false);
        });

        it('allows every origin when the array allowedOrigin has a wildcard entry', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: ['*'],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://example.com', callback);

            expect(callback).toHaveBeenCalledWith(null, true);
        });

        it('checks a non-wildcard array allowedOrigin against the origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: ['https://example.com'],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://other.com', callback);

            expect(callback).toHaveBeenCalledWith(null, false);
        });

        it('rejects an allowedOrigin of no recognized shape', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: undefined as unknown as string,
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
            const callback = vi.fn();

            middleware['originValidator']('https://example.com', callback);

            expect(callback).toHaveBeenCalledWith(null, false);
        });
    });

    describe('shouldAllowCredentials', () => {
        it('disallows credentials for the wildcard string', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: '*',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(middleware['shouldAllowCredentials']()).toBe(false);
        });

        it('allows credentials for a specific string origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: 'https://example.com',
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(middleware['shouldAllowCredentials']()).toBe(true);
        });

        it('disallows credentials for an array containing a wildcard', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: ['*'],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(middleware['shouldAllowCredentials']()).toBe(false);
        });

        it('allows credentials for an array with no wildcard', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: ['https://example.com'],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(middleware['shouldAllowCredentials']()).toBe(true);
        });

        it('allows credentials when allowedOrigin is a boolean', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: true,
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(middleware['shouldAllowCredentials']()).toBe(true);
        });
    });

    describe('isOriginAllowed', () => {
        it('rejects an invalid origin', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(
                middleware['isOriginAllowed']('not-a-url', [
                    'https://example.com',
                ])
            ).toBe(false);
        });

        it('matches an exact hostname and port', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(
                middleware['isOriginAllowed']('https://example.com:4000', [
                    'example.com:4000',
                ])
            ).toBe(true);
        });

        it('falls through to a wildcard pattern match', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(
                middleware['isOriginAllowed']('https://sub.example.com', [
                    '*.example.com',
                ])
            ).toBe(true);
        });

        it('rejects when no pattern matches, exact or wildcard', async () => {
            const middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });

            expect(
                middleware['isOriginAllowed']('https://sub.example.com', [
                    'other.com',
                ])
            ).toBe(false);
        });
    });

    describe('isValidOrigin', () => {
        let middleware: RequestCorsMiddleware;

        beforeEach(async () => {
            middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
        });

        it('accepts a well-formed http(s) origin', () => {
            expect(middleware['isValidOrigin']('https://example.com')).toBe(
                true
            );
        });

        it('rejects a non-http(s) protocol', () => {
            expect(middleware['isValidOrigin']('ftp://example.com')).toBe(
                false
            );
        });

        it('rejects an origin carrying a path', () => {
            expect(
                middleware['isValidOrigin']('https://example.com/path')
            ).toBe(false);
        });

        it('rejects an origin carrying a query string', () => {
            expect(middleware['isValidOrigin']('https://example.com?a=1')).toBe(
                false
            );
        });

        it('rejects an origin carrying a hash', () => {
            expect(
                middleware['isValidOrigin']('https://example.com#section')
            ).toBe(false);
        });

        it('rejects a malformed origin', () => {
            expect(middleware['isValidOrigin']('not-a-url')).toBe(false);
        });
    });

    describe('parseOrigin', () => {
        let middleware: RequestCorsMiddleware;

        beforeEach(async () => {
            middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
        });

        it('extracts hostname and port', () => {
            expect(
                middleware['parseOrigin']('https://example.com:4000')
            ).toEqual({ hostname: 'example.com', port: '4000' });
        });

        it('defaults port to an empty string when absent', () => {
            expect(middleware['parseOrigin']('https://example.com')).toEqual({
                hostname: 'example.com',
                port: '',
            });
        });

        it('answers empty values for a malformed origin', () => {
            expect(middleware['parseOrigin']('not-a-url')).toEqual({
                hostname: '',
                port: '',
            });
        });
    });

    describe('parsePattern', () => {
        let middleware: RequestCorsMiddleware;

        beforeEach(async () => {
            middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
        });

        it('splits a pattern carrying a port', () => {
            expect(middleware['parsePattern']('example.com:4000')).toEqual({
                hostname: 'example.com',
                port: '4000',
            });
        });

        it('defaults port to an empty string when the pattern has none', () => {
            expect(middleware['parsePattern']('example.com')).toEqual({
                hostname: 'example.com',
                port: '',
            });
        });
    });

    describe('matchWildcardOrigin', () => {
        let middleware: RequestCorsMiddleware;

        beforeEach(async () => {
            middleware = await buildMiddleware({
                allowedOrigin: [],
                allowedMethod: [],
                allowedHeader: [],
                exposedHeader: [],
            });
        });

        it('rejects when the port does not match the pattern', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'sub.example.com',
                    '3000',
                    '*.example.com:8080'
                )
            ).toBe(false);
        });

        it('matches a subdomain against a *.domain pattern', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'sub.example.com',
                    '',
                    '*.example.com'
                )
            ).toBe(true);
        });

        it('matches the base domain itself against a *.domain pattern', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'example.com',
                    '',
                    '*.example.com'
                )
            ).toBe(true);
        });

        it('rejects an unrelated hostname against a *.domain pattern', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'other.com',
                    '',
                    '*.example.com'
                )
            ).toBe(false);
        });

        it('rejects a wildcard placed inside the hostname segment', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'example.com',
                    '',
                    'sub*.example.com'
                )
            ).toBe(false);
        });

        it('rejects a wildcard confined to the port segment', () => {
            expect(
                middleware['matchWildcardOrigin'](
                    'example.com',
                    '*',
                    'example.com:*'
                )
            ).toBe(false);
        });
    });
});
