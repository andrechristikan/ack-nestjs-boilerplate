import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Breadcrumb, Event, Log } from '@sentry/nestjs';
import {
    LoggerRedactedValue,
    LoggerSentryRedactMaxDepth,
} from '@common/logger/constants/logger.constant';
import { SentryUtil } from '@common/sentry/utils/sentry.util';

describe('SentryUtil', () => {
    let util: SentryUtil;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SentryUtil],
        }).compile();

        util = module.get(SentryUtil);
    });

    describe('scrubEvent', () => {
        it('masks the request url, drops the query string, and redacts sensitive headers, cookies, and the body', () => {
            const event: Event = {
                request: {
                    url: 'https://api.example.com/api/v1/user/507f1f77bcf86cd799439011?token=abc',
                    query_string: 'token=abc',
                    headers: {
                        authorization: 'Bearer abc',
                        accept: 'application/json',
                    },
                    cookies: { session: 'abc' },
                    data: { password: 'secret', name: 'jane' },
                },
            };

            const result = util.scrubEvent(event);

            expect(result.request).toEqual({
                url: `https://api.example.com/api/v1/user/${LoggerRedactedValue}`,
                headers: {
                    authorization: LoggerRedactedValue,
                    accept: 'application/json',
                },
                cookies: { session: LoggerRedactedValue },
                data: { password: LoggerRedactedValue, name: 'jane' },
            });
        });

        it('keeps a request that carries no url, headers, cookies, or data', () => {
            const event: Event = { request: {} };

            expect(util.scrubEvent(event).request).toEqual({});
        });

        it('masks the transaction name and leaves an event with no transaction alone', () => {
            const named: Event = {
                transaction: 'GET /api/v1/user/507f1f77bcf86cd799439011',
            };
            const unnamed: Event = {};

            expect(util.scrubEvent(named).transaction).toBe(
                `GET /api/v1/user/${LoggerRedactedValue}`
            );
            expect(util.scrubEvent(unnamed).transaction).toBeUndefined();
        });

        it('masks a transaction target that is an absolute url and keeps a name with no url target', () => {
            expect(
                util.scrubEvent({
                    transaction:
                        'GET https://example.com/api/v1/user/507f1f77bcf86cd799439011',
                }).transaction
            ).toBe(
                `GET https://example.com/api/v1/user/${LoggerRedactedValue}`
            );
            expect(
                util.scrubEvent({ transaction: 'GET job' }).transaction
            ).toBe('GET job');
            expect(
                util.scrubEvent({ transaction: 'queue.process' }).transaction
            ).toBe('queue.process');
        });

        it('keeps the origin and masks the path of a relative-looking transaction target', () => {
            expect(
                util.scrubEvent({
                    transaction:
                        'GET /api/v1/user/507f1f77bcf86cd799439011?x=1#top',
                }).transaction
            ).toBe(`GET /api/v1/user/${LoggerRedactedValue}`);
        });

        it('scrubs the trace context data, every span, and every breadcrumb', () => {
            const event: Event = {
                contexts: {
                    trace: {
                        trace_id: 'trace',
                        span_id: 'span',
                        data: {
                            url: 'https://example.com/api/v1/user/507f1f77bcf86cd799439011',
                            'url.query': 'token=abc',
                            'http.request.header.authorization': 'Bearer abc',
                            'http.request.body.data': '{"password":"secret"}',
                        },
                    },
                },
                spans: [
                    {
                        description:
                            'GET /api/v1/user/507f1f77bcf86cd799439011',
                        data: {
                            'http.url':
                                'https://example.com/a/507f1f77bcf86cd799439011',
                        },
                        span_id: 'span-1',
                        trace_id: 'trace',
                        start_timestamp: 1,
                    },
                    {
                        data: {},
                        span_id: 'span-2',
                        trace_id: 'trace',
                        start_timestamp: 2,
                    },
                ],
                breadcrumbs: [
                    { data: { to: '/api/v1/user/507f1f77bcf86cd799439011' } },
                    { message: 'no data' },
                ],
            };

            const result = util.scrubEvent(event);

            expect(result.contexts?.trace?.data).toEqual({
                url: `https://example.com/api/v1/user/${LoggerRedactedValue}`,
                'http.request.header.authorization': LoggerRedactedValue,
                'http.request.body.data': JSON.stringify({
                    password: LoggerRedactedValue,
                }),
            });
            expect(result.spans?.[0]?.description).toBe(
                `GET /api/v1/user/${LoggerRedactedValue}`
            );
            expect(result.spans?.[0]?.data).toEqual({
                'http.url': `https://example.com/a/${LoggerRedactedValue}`,
            });
            expect(result.spans?.[1]?.description).toBeUndefined();
            expect(result.breadcrumbs?.[0]?.data).toEqual({
                to: `/api/v1/user/${LoggerRedactedValue}`,
            });
            expect(result.breadcrumbs?.[1]?.data).toBeUndefined();
        });

        it('redacts a sensitive key at any depth of extra', () => {
            const event: Event = {
                extra: {
                    userId: 'user-1',
                    password: 'secret',
                    nested: { refreshToken: 'abc', keep: 1 },
                    list: [{ apiKey: 'abc' }, 'plain'],
                },
            };

            expect(util.scrubEvent(event).extra).toEqual({
                userId: 'user-1',
                password: LoggerRedactedValue,
                nested: { refreshToken: LoggerRedactedValue, keep: 1 },
                list: [{ apiKey: LoggerRedactedValue }, 'plain'],
            });
        });

        it('redacts a sensitive key of every context', () => {
            const event: Event = {
                contexts: {
                    custom: { token: 'abc', keep: 'value' },
                    absent: undefined,
                    response: { status_code: 500 },
                },
            };

            const result = util.scrubEvent(event);

            expect(result.contexts?.custom).toEqual({
                token: LoggerRedactedValue,
                keep: 'value',
            });
            expect(result.contexts?.response).toEqual({ status_code: 500 });
        });

        it('replaces a value nested deeper than the redact depth', () => {
            let deep: Record<string, unknown> = { leaf: 'value' };
            for (let level = 0; level < LoggerSentryRedactMaxDepth; level++) {
                deep = { child: deep };
            }
            const event: Event = { extra: { deep } };

            const serialized = JSON.stringify(util.scrubEvent(event).extra);

            expect(serialized).toContain(LoggerRedactedValue);
            expect(serialized).not.toContain('value');
        });

        it('leaves an event with no extra or contexts untouched', () => {
            const event: Event = { message: 'boom' };

            expect(util.scrubEvent(event)).toEqual({ message: 'boom' });
        });
    });

    describe('scrubBreadcrumb', () => {
        it('masks a url and drops a query key from the breadcrumb data', () => {
            const breadcrumb: Breadcrumb = {
                data: {
                    url: 'https://example.com/api/v1/user/507f1f77bcf86cd799439011?x=1',
                    'url.query': 'x=1',
                },
            };

            expect(util.scrubBreadcrumb(breadcrumb).data).toEqual({
                url: `https://example.com/api/v1/user/${LoggerRedactedValue}`,
            });
        });

        it('returns a breadcrumb with no data unchanged', () => {
            const breadcrumb: Breadcrumb = { message: 'boom' };

            expect(util.scrubBreadcrumb(breadcrumb)).toEqual({
                message: 'boom',
            });
        });
    });

    describe('scrubLog', () => {
        it('returns a log with no attributes unchanged', () => {
            const log: Log = {
                level: 'info',
                message: 'hello',
            };

            expect(util.scrubLog(log)).toEqual({
                level: 'info',
                message: 'hello',
            });
        });

        it('redacts a sensitive attribute and scrubs a url attribute', () => {
            const log: Log = {
                level: 'error',
                message: 'failed',
                attributes: {
                    password: 'secret',
                    url: 'https://example.com/api/v1/user/507f1f77bcf86cd799439011',
                    'http.request.header.authorization': 'Bearer abc',
                    userId: 'user-1',
                },
            };

            expect(util.scrubLog(log).attributes).toEqual({
                password: LoggerRedactedValue,
                url: `https://example.com/api/v1/user/${LoggerRedactedValue}`,
                'http.request.header.authorization': LoggerRedactedValue,
                userId: 'user-1',
            });
        });
    });

    describe('maskPath', () => {
        it('keeps a route parameter name, a version, and a kebab-case word and redacts the rest', () => {
            expect(util['maskPath']('/api/v1/:userId/sign-up/1a2b')).toBe(
                `/api/v1/:userId/sign-up/${LoggerRedactedValue}`
            );
        });
    });

    describe('maskUrl', () => {
        it('keeps the origin of an absolute url and masks its path', () => {
            expect(
                util['maskUrl'](
                    'https://example.com/api/v1/user/507f1f77bcf86cd799439011?x=1#top'
                )
            ).toBe(`https://example.com/api/v1/user/${LoggerRedactedValue}`);
        });

        it('masks a relative path and drops its query and fragment', () => {
            expect(
                util['maskUrl']('/api/v1/user/507f1f77bcf86cd799439011?x=1#top')
            ).toBe(`/api/v1/user/${LoggerRedactedValue}`);
        });
    });

    describe('redactBody', () => {
        it('redacts an object body by key', () => {
            expect(util['redactBody']({ password: 'secret' })).toEqual({
                password: LoggerRedactedValue,
            });
        });

        it('returns an empty string body as given', () => {
            expect(util['redactBody']('   ')).toBe('   ');
        });

        it('redacts a JSON object or array string by key', () => {
            expect(util['redactBody']('{"token":"abc","a":1}')).toBe(
                JSON.stringify({ token: LoggerRedactedValue, a: 1 })
            );
            expect(util['redactBody']('[{"secret":"abc"}]')).toBe(
                JSON.stringify([{ secret: LoggerRedactedValue }])
            );
        });

        it('redacts a string that starts like JSON but does not parse', () => {
            expect(util['redactBody']('{broken')).toBe(LoggerRedactedValue);
        });

        it('redacts a sensitive key of a form body, including a bracketed one', () => {
            expect(
                util['redactBody']('name=jane&user[password]=secret&a=b%20c')
            ).toBe(
                `name=jane&user%5Bpassword%5D=${LoggerRedactedValue}&a=b%20c`
            );
        });

        it('redacts a string that is neither JSON nor a form body', () => {
            expect(util['redactBody']('free text body')).toBe(
                LoggerRedactedValue
            );
        });
    });

    describe('isSensitiveHeaderAttribute', () => {
        it('flags a sensitive header attribute written with underscores', () => {
            expect(
                util['isSensitiveHeaderAttribute'](
                    'http.response.header.x_api_key'
                )
            ).toBe(true);
        });

        it('passes a non-sensitive header attribute and a key with no header prefix', () => {
            expect(
                util['isSensitiveHeaderAttribute']('http.request.header.accept')
            ).toBe(false);
            expect(util['isSensitiveHeaderAttribute']('url.path')).toBe(false);
        });
    });

    describe('redactValue', () => {
        it('returns a primitive and null as given', () => {
            expect(util['redactValue'](null, 0)).toBeNull();
            expect(util['redactValue']('text', 0)).toBe('text');
            expect(util['redactValue'](3, 0)).toBe(3);
        });
    });
});
