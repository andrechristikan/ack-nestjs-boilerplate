import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import type { UserAgent } from '@generated/prisma-client/client';

vi.mock('ua-parser-js', () => ({
    UAParser: vi.fn(),
}));
vi.mock('geoip-lite', () => ({
    default: { lookup: vi.fn() },
}));

interface IUAParserResult {
    ua?: string;
    browser: {
        name?: string;
        version?: string;
        major?: string;
        type?: string;
    };
    cpu: { architecture?: string };
    device: { type?: string; vendor?: string; model?: string };
    engine: { name?: string; version?: string };
    os: { name?: string; version?: string };
}

const emptyResult: IUAParserResult = {
    browser: {},
    cpu: {},
    device: {},
    engine: {},
    os: {},
};

describe('RequestUtil', () => {
    let UAParser: typeof import('ua-parser-js').UAParser;
    let geoIp: typeof import('geoip-lite');
    let RequestUtil: typeof import('@common/request/utils/request.util').RequestUtil;
    let util: InstanceType<typeof RequestUtil>;

    beforeEach(async () => {
        vi.resetAllMocks();
        vi.resetModules();
        ({ UAParser } = await import('ua-parser-js'));
        ({ default: geoIp } = (await import('geoip-lite')) as unknown as {
            default: typeof import('geoip-lite');
        });
        ({ RequestUtil } = await import('@common/request/utils/request.util'));

        const module: TestingModule = await Test.createTestingModule({
            providers: [RequestUtil],
        }).compile();

        util = module.get(RequestUtil);
    });

    describe('parseUserAgent', () => {
        it('groups every populated field when the user agent is fully resolved', () => {
            const result: IUAParserResult = {
                ua: 'Mozilla/5.0',
                browser: {
                    name: 'Chrome',
                    version: '120.0',
                    major: '120',
                },
                cpu: { architecture: 'amd64' },
                device: {
                    type: 'mobile',
                    vendor: 'Apple',
                    model: 'iPhone',
                },
                engine: { name: 'Blink', version: '120' },
                os: { name: 'iOS', version: '17' },
            };
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                result
            );

            const parsed = util.parseUserAgent('Mozilla/5.0');

            expect(parsed).toEqual({
                ua: 'Mozilla/5.0',
                browser: {
                    name: 'Chrome',
                    version: '120.0',
                    major: '120',
                    type: null,
                },
                cpu: { architecture: 'amd64' },
                device: { type: 'mobile', vendor: 'Apple', model: 'iPhone' },
                engine: { name: 'Blink', version: '120' },
                os: { name: 'iOS', version: '17' },
            });
        });

        it('nulls out every group and the ua when nothing is resolved', () => {
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                emptyResult
            );

            const parsed = util.parseUserAgent(null);

            expect(parsed).toEqual({
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            });
        });

        it('keeps a group when only one of its fields resolves', () => {
            const result: IUAParserResult = {
                ...emptyResult,
                device: { vendor: 'Apple' },
            };
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                result
            );

            const parsed = util.parseUserAgent('ua');

            expect(parsed.device).toEqual({
                type: null,
                vendor: 'Apple',
                model: null,
            });
        });
    });

    describe('buildRequestLog', () => {
        it('resolves geo-location when the client IP is found and geoip has a match', () => {
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                emptyResult
            );
            (geoIp.lookup as ReturnType<typeof vi.fn>).mockReturnValue({
                ll: [37.77, -122.41],
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            });
            const req = {
                headers: { 'user-agent': 'ua' },
                ip: '203.0.113.5',
                socket: {},
            } as unknown as Request;

            const log = util.buildRequestLog(req);

            expect(geoIp.lookup).toHaveBeenCalledWith('203.0.113.5');
            expect(log.ipAddress).toBe('203.0.113.5');
            expect(log.geoLocation).toEqual({
                latitude: 37.77,
                longitude: -122.41,
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            });
            expect(log.userAgent).toEqual({
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            } as UserAgent);
        });

        it('leaves geo-location null when geoip has no match for the resolved IP', () => {
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                emptyResult
            );
            (geoIp.lookup as ReturnType<typeof vi.fn>).mockReturnValue(null);
            const req = {
                headers: {},
                ip: '203.0.113.5',
                socket: {},
            } as unknown as Request;

            const log = util.buildRequestLog(req);

            expect(log.geoLocation).toBeNull();
        });

        it('leaves geo-location null and skips the lookup when no client IP resolves', () => {
            (UAParser as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
                emptyResult
            );
            const req = {
                headers: {},
                socket: {},
            } as unknown as Request;

            const log = util.buildRequestLog(req);

            expect(geoIp.lookup).not.toHaveBeenCalled();
            expect(log.ipAddress).toBeNull();
            expect(log.geoLocation).toBeNull();
        });
    });

    describe('getClientIp', () => {
        it('returns req.ip and ignores a spoofed X-Forwarded-For header', () => {
            const req = {
                ip: '203.0.113.5',
                headers: { 'x-forwarded-for': '198.51.100.9' },
                socket: { remoteAddress: '10.0.0.1' },
            } as unknown as Request;

            expect(util.getClientIp(req)).toBe('203.0.113.5');
        });

        it('falls back to the socket address when req.ip is unset', () => {
            const req = {
                headers: {},
                socket: { remoteAddress: '10.0.0.1' },
            } as unknown as Request;

            expect(util.getClientIp(req)).toBe('10.0.0.1');
        });

        it('returns an empty string when neither source resolves', () => {
            const req = { headers: {}, socket: {} } as unknown as Request;

            expect(util.getClientIp(req)).toBe('');
        });
    });

    describe('groupOrNull', () => {
        it('returns the group when at least one value is not null', () => {
            const group = { a: 'x', b: null };

            expect(util['groupOrNull'](group, ['x', null])).toBe(group);
        });

        it('returns null when every value is null', () => {
            const group = { a: null, b: null };

            expect(util['groupOrNull'](group, [null, null])).toBeNull();
        });
    });
});
