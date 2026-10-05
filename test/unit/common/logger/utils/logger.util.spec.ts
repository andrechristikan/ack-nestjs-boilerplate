import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Response } from 'express';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import { EnumLoggerSeverity } from '@common/logger/enums/logger.enum';
import {
    LoggerRedactedValue,
    LoggerRedactMaxArrayLength,
} from '@common/logger/constants/logger.constant';
import {
    RequestCorrelationIdHeaderName,
    RequestIdHeaderName,
} from '@common/request/constants/request.constant';
import type { IRequestApp } from '@common/request/interfaces/request.interface';

describe('LoggerUtil', () => {
    const accessPayload: IAuthJwtAccessTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        email: 'jane@example.com',
        username: 'jane',
        userId: 'u1',
        sessionId: 'session-1',
        deviceOwnershipId: 'device-1',
        roleId: 'role-1',
    };

    const baseRequest = {
        id: 'req-1',
        method: 'GET',
        url: '/api/public/hello',
        originalUrl: '/api/public/hello',
        baseUrl: '',
        route: undefined,
        ip: '1.2.3.4',
        socket: {},
        params: {},
        query: {},
        headers: {},
        user: undefined,
    };

    let util: LoggerUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [LoggerUtil],
        }).compile();

        util = module.get(LoggerUtil);
    });

    describe('getRequestId', () => {
        it('returns request.id when there are no headers', () => {
            const request = {
                ...baseRequest,
                id: 'fallback',
                headers: undefined,
            } as unknown as IRequestApp;

            expect(util.getRequestId(request)).toBe('fallback');
        });

        it('returns the correlation id header when present', () => {
            const request = {
                ...baseRequest,
                headers: { [RequestCorrelationIdHeaderName]: 'corr-1' },
            } as unknown as IRequestApp;

            expect(util.getRequestId(request)).toBe('corr-1');
        });

        it('falls back to the request id header when correlation id is absent', () => {
            const request = {
                ...baseRequest,
                headers: { [RequestIdHeaderName]: 'req-2' },
            } as unknown as IRequestApp;

            expect(util.getRequestId(request)).toBe('req-2');
        });

        it('falls back to request.id when neither header is present', () => {
            const request = {
                ...baseRequest,
                id: 'fallback-2',
                headers: {},
            } as unknown as IRequestApp;

            expect(util.getRequestId(request)).toBe('fallback-2');
        });
    });

    describe('sanitizeMessage', () => {
        it('strips ansi codes, control characters and collapses whitespace', () => {
            const message =
                '\u001b[31mHello\u001b[0m ~ World → Foo\n42 answer line\n  extra   space ';

            const result = util.sanitizeMessage(message);

            expect(result).toBe('Hello World Foo answer line extra space');
        });

        it('returns a non-string value unchanged', () => {
            expect(util.sanitizeMessage(42)).toBe(42);
        });
    });

    describe('redactValue', () => {
        it('redacts sensitive fields at any depth', () => {
            const result = util.redactValue({
                user: { password: 'secret', name: 'ok' },
            });

            expect(result).toEqual({
                user: { password: LoggerRedactedValue, name: 'ok' },
            });
        });
    });

    describe('maskUrl', () => {
        it('masks the pathname of a parseable absolute url', () => {
            const result = util.maskUrl(
                'https://host.com/api/user/507f1f77bcf86cd799439011'
            );

            expect(result).toBe(
                `https://host.com/api/user/${LoggerRedactedValue}`
            );
        });

        it('falls back to a manual split for a url that fails to parse', () => {
            const result = util.maskUrl(
                '/api/user/507f1f77bcf86cd799439011?x=1#f'
            );

            expect(result).toBe(`/api/user/${LoggerRedactedValue}`);
        });
    });

    describe('serializeRequest', () => {
        it('shapes the request with a masked referer when present', () => {
            const request = {
                ...baseRequest,
                id: 'req-3',
                method: 'POST',
                baseUrl: '/api',
                route: { path: '/user' },
                headers: {
                    referer:
                        'https://host.com/api/user/507f1f77bcf86cd799439011',
                    'user-agent': 'agent',
                    'content-type': 'application/json',
                },
                query: { search: 'x' },
                params: { id: '1' },
                user: accessPayload,
            } as unknown as IRequestApp;

            const result = util.serializeRequest(request);

            expect(result).toMatchObject({
                id: 'req-3',
                method: 'POST',
                route: '/api/user',
                userAgent: 'agent',
                contentType: 'application/json',
                referer: `https://host.com/api/user/${LoggerRedactedValue}`,
                ip: '1.2.3.4',
                user: 'u1',
                query: { search: 'x' },
                params: { id: LoggerRedactedValue },
            });
        });

        it('sets the referer to null when the header is absent', () => {
            const request = {
                ...baseRequest,
                headers: {},
            } as unknown as IRequestApp;

            const result = util.serializeRequest(request);

            expect(result.referer).toBeNull();
        });
    });

    describe('serializeResponse', () => {
        it('shapes the response headers and metadata', () => {
            const response: MockProxy<Response> = mock<Response>();
            response.statusCode = 201;
            response.getHeaders.mockReturnValue({
                'content-length': '10',
                authorization: 'secret',
            });
            response.getHeader.mockImplementation((name: string) =>
                name === 'content-length'
                    ? '10'
                    : name === 'X-Response-Time'
                      ? '5ms'
                      : undefined
            );

            const result = util.serializeResponse(response);

            expect(result).toEqual({
                httpCode: 201,
                contentLength: '10',
                responseTime: '5ms',
                headers: {
                    'content-length': '10',
                    authorization: LoggerRedactedValue,
                },
            });
        });
    });

    describe('serializeError', () => {
        it('shapes a plain error', () => {
            const error = new Error('boom');

            const result = util.serializeError(error);

            expect(result).toMatchObject({
                type: 'Error',
                message: 'boom',
                code: undefined,
                statusCode: undefined,
                stack: error.stack,
            });
        });

        it('reads a status and response statusCode when present', () => {
            const error = new Error('boom') as Error & {
                status?: number;
                response?: { statusCode?: number };
            };
            error.status = 500;
            error.response = { statusCode: 500 };

            const result = util.serializeError(error);

            expect(result).toMatchObject({ code: 500, statusCode: 500 });
        });

        it('replaces the stack with the response _error for an HttpException carrying one', () => {
            const error = new HttpException(
                { message: 'bad', _error: 'cause detail' },
                400
            );

            const result = util.serializeError(error);

            expect(result.stack).toBe('cause detail');
        });

        it('keeps the default stack for an HttpException with no _error', () => {
            const error = new HttpException('bad', 400);

            const result = util.serializeError(error);

            expect(result.stack).toBe(error.stack);
        });
    });

    describe('mapLevelToSeverity', () => {
        it('maps 60 and above to critical', () => {
            expect(util.mapLevelToSeverity(60)).toBe(
                EnumLoggerSeverity.critical.toUpperCase()
            );
        });

        it('maps 50 to error', () => {
            expect(util.mapLevelToSeverity(50)).toBe(
                EnumLoggerSeverity.error.toUpperCase()
            );
        });

        it('maps 40 to warning', () => {
            expect(util.mapLevelToSeverity(40)).toBe(
                EnumLoggerSeverity.warning.toUpperCase()
            );
        });

        it('maps 30 to info', () => {
            expect(util.mapLevelToSeverity(30)).toBe(
                EnumLoggerSeverity.info.toUpperCase()
            );
        });

        it('maps 20 to debug', () => {
            expect(util.mapLevelToSeverity(20)).toBe(
                EnumLoggerSeverity.debug.toUpperCase()
            );
        });

        it('maps below 20 to trace', () => {
            expect(util.mapLevelToSeverity(10)).toBe(
                EnumLoggerSeverity.trace.toUpperCase()
            );
        });
    });

    describe('redactNested', () => {
        it('returns a falsy value unchanged', () => {
            expect(util['redactNested'](null, 0)).toBeNull();
        });

        it('returns a non-object value unchanged', () => {
            expect(util['redactNested']('plain', 0)).toBe('plain');
        });

        it('returns a Date instance unchanged', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');

            expect(util['redactNested'](date, 0)).toBe(date);
        });

        it('returns a RegExp instance unchanged', () => {
            const regex = /abc/;

            expect(util['redactNested'](regex, 0)).toBe(regex);
        });

        it('replaces a value whole once the max depth is reached', () => {
            expect(util['redactNested']({ a: 1 }, 5)).toBe(LoggerRedactedValue);
        });

        it('replaces a Buffer with a marker', () => {
            expect(util['redactNested'](Buffer.from('x'), 0)).toEqual({
                buffer: '[BUFFER]',
            });
        });

        it('recurses through an array within the length cap', () => {
            expect(util['redactNested']([1, 2, 3], 0)).toEqual([1, 2, 3]);
        });

        it('truncates an array past the length cap with a marker', () => {
            const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

            const result = util['redactNested'](input, 0) as unknown[];

            expect(result).toHaveLength(LoggerRedactMaxArrayLength + 1);
            expect(result.slice(0, LoggerRedactMaxArrayLength)).toEqual(
                input.slice(0, LoggerRedactMaxArrayLength)
            );
            expect(result[LoggerRedactMaxArrayLength]).toEqual({
                truncated: `...[TRUNCATED] - total length ${input.length}`,
            });
        });

        it('redacts a sensitive key at any casing regardless of value shape', () => {
            const result = util['redactNested'](
                { Password: { nested: 'value' } },
                0
            );

            expect(result).toEqual({ Password: LoggerRedactedValue });
        });

        it('recurses into a non-sensitive object-valued key', () => {
            const result = util['redactNested']({ meta: { a: 1 } }, 0);

            expect(result).toEqual({ meta: { a: 1 } });
        });

        it('sanitizes a non-sensitive primitive-valued key', () => {
            const result = util['redactNested'](
                { msg: '  padded   text  ' },
                0
            );

            expect(result).toEqual({ msg: 'padded text' });
        });
    });

    describe('maskPath', () => {
        it('keeps an empty segment', () => {
            expect(util['maskPath']('/')).toBe('/');
        });

        it('keeps a route parameter segment', () => {
            expect(util['maskPath']('/:userId')).toBe('/:userId');
        });

        it('keeps a version segment', () => {
            expect(util['maskPath']('/v1')).toBe('/v1');
        });

        it('keeps a static kebab-case segment', () => {
            expect(util['maskPath']('/sign-up')).toBe('/sign-up');
        });

        it('redacts a purely numeric segment', () => {
            expect(util['maskPath']('/123')).toBe(`/${LoggerRedactedValue}`);
        });

        it('redacts a Mongo-id-shaped segment', () => {
            expect(util['maskPath']('/507f1f77bcf86cd799439011')).toBe(
                `/${LoggerRedactedValue}`
            );
        });
    });

    describe('extractClientIP', () => {
        it('returns request.ip when present', () => {
            const request = {
                ...baseRequest,
                ip: '9.9.9.9',
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('9.9.9.9');
        });

        it('falls back to the socket remote address', () => {
            const request = {
                ...baseRequest,
                ip: undefined,
                socket: { remoteAddress: '8.8.8.8' },
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('8.8.8.8');
        });

        it('falls back to the first forwarded-for address', () => {
            const request = {
                ...baseRequest,
                ip: undefined,
                socket: {},
                headers: { 'x-forwarded-for': '5.5.5.5, 6.6.6.6' },
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('5.5.5.5');
        });

        it('falls back to x-real-ip when forwarded-for is empty', () => {
            const request = {
                ...baseRequest,
                ip: undefined,
                socket: {},
                headers: { 'x-forwarded-for': ' , ', 'x-real-ip': '7.7.7.7' },
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('7.7.7.7');
        });

        it('returns unknown when headers carry no address', () => {
            const request = {
                ...baseRequest,
                ip: undefined,
                socket: {},
                headers: {},
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('unknown');
        });

        it('returns unknown when there are no headers at all', () => {
            const request = {
                ...baseRequest,
                ip: undefined,
                socket: {},
                headers: undefined,
            } as unknown as IRequestApp;

            expect(util['extractClientIP'](request)).toBe('unknown');
        });
    });

    describe('serializeRoute', () => {
        it('joins the base url and the matched route path', () => {
            const request = {
                ...baseRequest,
                baseUrl: '/api',
                route: { path: '/user/:id' },
            } as unknown as IRequestApp;

            expect(util['serializeRoute'](request)).toBe('/api/user/:id');
        });

        it('masks the original url when no route matched', () => {
            const request = {
                ...baseRequest,
                route: undefined,
                originalUrl: '/api/user/507f1f77bcf86cd799439011',
            } as unknown as IRequestApp;

            expect(util['serializeRoute'](request)).toBe(
                `/api/user/${LoggerRedactedValue}`
            );
        });

        it('falls back to request.url when originalUrl is absent', () => {
            const request = {
                ...baseRequest,
                route: undefined,
                originalUrl: undefined,
                url: '/api/user/507f1f77bcf86cd799439011',
            } as unknown as IRequestApp;

            expect(util['serializeRoute'](request)).toBe(
                `/api/user/${LoggerRedactedValue}`
            );
        });
    });

    describe('serializeParams', () => {
        it('redacts every param value', () => {
            expect(util['serializeParams']({ id: '1', slug: 'x' })).toEqual({
                id: LoggerRedactedValue,
                slug: LoggerRedactedValue,
            });
        });

        it('returns an empty object when params is null', () => {
            expect(util['serializeParams'](null)).toEqual({});
        });
    });

    describe('serializeUser', () => {
        it('returns the userId when a user is present', () => {
            const request = {
                ...baseRequest,
                user: accessPayload,
            } as unknown as IRequestApp;

            expect(util['serializeUser'](request)).toBe('u1');
        });

        it('returns null when no user is present', () => {
            const request = {
                ...baseRequest,
                user: undefined,
            } as unknown as IRequestApp;

            expect(util['serializeUser'](request)).toBeNull();
        });
    });
});
