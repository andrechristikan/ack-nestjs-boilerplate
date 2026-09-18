import { createMock } from '@golevelup/ts-vitest';
import { type IncomingMessage } from 'http';
import { getClientIp } from '@supercharge/request-ip';
import geoIp from 'geoip-lite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestUtil } from '@common/request/utils/request.util';

vi.mock(import('@supercharge/request-ip'), () => ({
    getClientIp: vi.fn(),
}));
vi.mock('geoip-lite', () => ({
    default: { lookup: vi.fn() },
}));

describe('RequestUtil', () => {
    const service = new RequestUtil();
    const getClientIpMock = vi.mocked(getClientIp);
    const geoLookup = vi.mocked(geoIp.lookup);

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it.each([
        ['203.0.113.1', 'socket-address', '203.0.113.1'],
        ['invalid', 'socket-address', 'socket-address'],
        [undefined, 'socket-address', 'socket-address'],
    ])(
        'resolves request IP %s with its socket fallback',
        (ip, remote, expected) => {
            const request = createMock<IRequestApp>({
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

    it('builds request log IP and geolocation at the owned module boundary', () => {
        getClientIpMock.mockReturnValue('203.0.113.10');
        geoLookup.mockReturnValue({
            range: [0, 1],
            country: 'IT',
            region: 'RM',
            eu: '1',
            timezone: 'Europe/Rome',
            city: 'Rome',
            ll: [41.9, 12.5],
            metro: 0,
            area: 1,
        });
        const request = createMock<IncomingMessage>({
            headers: { 'user-agent': 'test-agent' },
        });

        expect(service.buildRequestLog(request)).toMatchObject({
            ipAddress: '203.0.113.10',
            geoLocation: {
                latitude: 41.9,
                longitude: 12.5,
                country: 'IT',
                region: 'RM',
                city: 'Rome',
            },
        });
    });
});
