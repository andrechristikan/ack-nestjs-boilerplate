import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    LoggerRedactMaxArrayLength,
    LoggerRedactedValue,
} from '@common/logger/constants/logger.constant';
import { LoggerUtil } from '@common/logger/utils/logger.util';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import type { Response } from 'express';

describe('LoggerUtil', () => {
    let util: LoggerUtil;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [LoggerUtil],
        }).compile();

        util = moduleRef.get(LoggerUtil);
    });

    describe('getRequestId', () => {
        it('uses correlation, request, and fallback ids in priority order', () => {
            const request = mock<IRequestApp>();
            request.id = 'fallback-id';
            request.headers = {
                'x-correlation-id': 'correlation-id',
                'x-request-id': 'request-id',
            };
            expect(util.getRequestId(request)).toBe('correlation-id');

            request.headers = { 'x-request-id': 'request-id' };
            expect(util.getRequestId(request)).toBe('request-id');

            request.headers = {};
            expect(util.getRequestId(request)).toBe('fallback-id');

            request.headers = undefined as never;
            expect(util.getRequestId(request)).toBe('fallback-id');
        });
    });

    describe('sanitizeMessage', () => {
        it('removes terminal formatting, arrows, line numbers, and excess whitespace', () => {
            expect(
                util.sanitizeMessage(
                    '\u001B[31m  12  hello  → world ~ \u001B[0m'
                )
            ).toBe('hello world');
        });

        it('returns non-string values unchanged', () => {
            const value = { message: 'unchanged' };
            expect(util.sanitizeMessage(value)).toBe(value);
        });
    });

    describe('redactValue', () => {
        it('redacts sensitive keys and sanitizes primitive values recursively', () => {
            const value = {
                password: 'secret',
                profile: {
                    apiKey: 'key',
                    message: '  1 hello → world ',
                },
            };

            expect(util.redactValue(value)).toEqual({
                password: LoggerRedactedValue,
                profile: {
                    apiKey: LoggerRedactedValue,
                    message: 'hello world',
                },
            });
        });

        it('preserves scalar, Date, and RegExp values and masks deep values', () => {
            const date = new Date('2026-01-01T00:00:00.000Z');
            const regex = /value/;
            expect(util.redactValue(null)).toBeNull();
            expect(util.redactValue(date)).toBe(date);
            expect(util.redactValue(regex)).toBe(regex);
            expect(
                util.redactValue({
                    a: { b: { c: { d: { e: { f: 'secret' } } } } },
                })
            ).toEqual({
                a: { b: { c: { d: { e: LoggerRedactedValue } } } },
            });
        });

        it('marks buffers and truncates long arrays', () => {
            expect(util.redactValue(Buffer.from('secret'))).toEqual({
                buffer: '[BUFFER]',
            });
            const values = Array.from(
                { length: LoggerRedactMaxArrayLength + 2 },
                (_, index) => index
            );
            const result = util.redactValue(values);
            expect(result).toEqual([
                ...values.slice(0, LoggerRedactMaxArrayLength),
                {
                    truncated: `...[TRUNCATED] - total length ${values.length}`,
                },
            ]);
            expect(util.redactValue(['value'])).toEqual(['value']);
        });
    });

    describe('maskUrl', () => {
        it('drops query and fragment data and masks dynamic path segments', () => {
            expect(
                util.maskUrl(
                    'https://example.com/api/v1/users/507f1f77bcf86cd799439011?token=secret'
                )
            ).toBe(`https://example.com/api/v1/users/${LoggerRedactedValue}`);
            expect(util.maskUrl('/api/users/ABC123?token=secret#part')).toBe(
                `/api/users/${LoggerRedactedValue}`
            );
        });
    });

    describe('serializeRequest', () => {
        it('serializes a route and redacts request data', () => {
            const request = mock<IRequestApp>();
            request.id = 'request-id';
            request.method = 'GET';
            request.baseUrl = '/api';
            request.route = { path: '/users/:id' };
            Object.assign(request, { ip: '10.0.0.1' });
            const user: IAuthJwtAccessTokenPayload = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'ada@example.com',
                username: 'ada',
                userId: 'user-id',
                sessionId: 'session-id',
                deviceOwnershipId: 'ownership-id',
                roleId: 'role-id',
            };
            request.user = user;
            request.query = { token: 'secret' };
            request.params = { id: 'user-id' };
            request.headers = {
                authorization: 'Bearer secret',
                referer: 'https://example.com/users/ABC123?token=secret',
                'user-agent': 'agent',
                'content-type': 'application/json',
            };
            Object.assign(request, { remoteAddress: 'remote', remotePort: 42 });

            expect(util.serializeRequest(request)).toEqual({
                id: 'request-id',
                method: 'GET',
                route: '/api/users/:id',
                userAgent: 'agent',
                contentType: 'application/json',
                referer: `https://example.com/users/${LoggerRedactedValue}`,
                remoteAddress: 'remote',
                remotePort: 42,
                ip: '10.0.0.1',
                user: 'user-id',
                query: { token: LoggerRedactedValue },
                params: { id: LoggerRedactedValue },
                headers: {
                    authorization: LoggerRedactedValue,
                    referer: LoggerRedactedValue,
                    'user-agent': 'agent',
                    'content-type': 'application/json',
                },
            });
        });

        it('falls back through socket, forwarded, real, and unknown client IPs', () => {
            const request = mock<IRequestApp>();
            request.id = 'id';
            request.method = 'GET';
            request.url = '/users/ABC123';
            request.originalUrl = '/users/ABC123?secret=value';
            request.query = {};
            request.params = {};
            request.user = undefined;
            Object.assign(request, { ip: undefined });
            request.headers = {};
            request.socket = { remoteAddress: 'socket-ip' } as never;
            expect(util.serializeRequest(request).ip).toBe('socket-ip');

            request.socket = undefined as never;
            request.headers = { 'x-forwarded-for': 'first-ip, second-ip' };
            expect(util.serializeRequest(request).ip).toBe('first-ip');

            request.headers = {
                'x-forwarded-for': '   ',
                'x-real-ip': 'real-ip',
            };
            expect(util.serializeRequest(request).ip).toBe('real-ip');

            request.headers = {};
            expect(util.serializeRequest(request).ip).toBe('unknown');
            expect(util.serializeRequest(request).referer).toBeUndefined();
            expect(util.serializeRequest(request).route).toBe(
                `/users/${LoggerRedactedValue}`
            );

            request.originalUrl = undefined as never;
            expect(util['serializeRoute'](request)).toBe(
                `/users/${LoggerRedactedValue}`
            );
            request.headers = undefined as never;
            expect(util['extractClientIP'](request)).toBe('unknown');
            expect(util['serializeParams'](undefined)).toEqual({});
        });
    });

    describe('serializeResponse', () => {
        it('serializes status, timing, length, and redacted headers', () => {
            const response: MockProxy<Response> = mock<Response>();
            response.statusCode = 201;
            response.getHeaders.mockReturnValue({ authorization: 'secret' });
            response.getHeader
                .calledWith('content-length')
                .mockReturnValue('12');
            response.getHeader
                .calledWith('X-Response-Time')
                .mockReturnValue('5ms');

            expect(util.serializeResponse(response)).toEqual({
                httpCode: 201,
                contentLength: '12',
                responseTime: '5ms',
                headers: { authorization: LoggerRedactedValue },
            });
        });
    });

    describe('serializeError', () => {
        it('serializes standard and HTTP exceptions', () => {
            const error = Object.assign(new Error('  1 failure → now '), {
                status: 500,
                response: { statusCode: 500 },
            });
            expect(util.serializeError(error)).toMatchObject({
                type: 'Error',
                message: 'failure now',
                code: 500,
                statusCode: 500,
                stack: expect.any(String),
            });

            const httpError = new HttpException(
                { _error: { cause: 'raw' } },
                HttpStatus.BAD_REQUEST
            );
            expect(util.serializeError(httpError)).toMatchObject({
                type: 'HttpException',
                stack: '[object Object]',
            });

            const plainHttpError = new HttpException(
                'bad',
                HttpStatus.BAD_REQUEST
            );
            expect(util.serializeError(plainHttpError).stack).toBe(
                plainHttpError.stack
            );
        });
    });

    describe('mapLevelToSeverity', () => {
        it.each([
            [60, 'CRITICAL'],
            [50, 'ERROR'],
            [40, 'WARNING'],
            [30, 'INFO'],
            [20, 'DEBUG'],
            [10, 'TRACE'],
        ])('maps level %i to %s', (level, severity) => {
            expect(util.mapLevelToSeverity(level)).toBe(severity);
        });
    });
});
