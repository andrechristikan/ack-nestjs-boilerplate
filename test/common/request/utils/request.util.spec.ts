import { type IncomingMessage } from 'http';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

describe('RequestUtil', () => {
    const service = new RequestUtil();
    it.each([
        ['203.0.113.1', 'socket-address', '203.0.113.1'],
        ['invalid', 'socket-address', 'socket-address'],
        [undefined, 'socket-address', 'socket-address'],
    ])(
        'resolves request IP %s with its socket fallback',
        (ip, remote, expected) => {
            const request: MockProxy<IRequestApp> = mock<IRequestApp>({
                ip,
                socket: { remoteAddress: remote },
            });

            expect(service.resolveThrottleTrackerIp(request)).toBe(expected);
        }
    );

    it('parses a user agent into normalized nullable groups', () => {
        const result = service.parseUserAgent(
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1'
        );

        expect(result).toMatchObject({
            browser: expect.objectContaining({ name: 'Mobile Safari' }),
            device: expect.objectContaining({
                vendor: 'Apple',
                model: 'iPhone',
            }),
            os: expect.objectContaining({ name: 'iOS' }),
        });
    });

    it('returns null groups for an absent user agent', () => {
        expect(service.parseUserAgent(undefined)).toMatchObject({
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        });
    });

    it('builds request log IP and geolocation from a public client address', () => {
        const request = mock<IncomingMessage>({
            headers: {
                'user-agent': 'test-agent',
                'x-forwarded-for': '8.8.8.8',
            },
        });

        const log = service.buildRequestLog(request);

        expect(log.ipAddress).toBe('8.8.8.8');
        expect(log.geoLocation).toMatchObject({
            country: 'US',
            latitude: expect.any(Number),
            longitude: expect.any(Number),
        });
    });

    it('builds request log without geolocation for a private address', () => {
        const request = mock<IncomingMessage>({
            headers: { 'x-forwarded-for': '10.0.0.1' },
        });

        const log = service.buildRequestLog(request);

        expect(log.ipAddress).toBe('10.0.0.1');
        expect(log.geoLocation).toBeNull();
    });

    it('builds request log with a null IP when the client address is not a valid IP', () => {
        const request = mock<IncomingMessage>({
            headers: { 'x-forwarded-for': 'not-an-ip' },
        });

        const log = service.buildRequestLog(request);

        expect(log.ipAddress).toBeNull();
        expect(log.geoLocation).toBeNull();
    });
});
