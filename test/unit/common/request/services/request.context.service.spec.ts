import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { hostname } from 'os';
import type { GeoLocation, UserAgent } from '@generated/prisma-client/client';
import { RequestContextService } from '@common/request/services/request.context.service';

describe('RequestContextService', () => {
    let service: RequestContextService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [RequestContextService],
        }).compile();

        service = module.get(RequestContextService);
    });

    describe('getHostname', () => {
        it('returns the OS hostname', () => {
            expect(service.getHostname()).toBe(hostname());
        });
    });

    describe('resolveCity', () => {
        it('returns the geo-location city when present', () => {
            const geoLocation = {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: 'San Francisco',
            } as GeoLocation;

            expect(service.resolveCity(geoLocation)).toBe('San Francisco');
        });

        it('returns a fallback when the geo-location is null', () => {
            expect(service.resolveCity(null)).toBe('Unknown Location');
        });

        it('returns a fallback when the geo-location city is null', () => {
            const geoLocation = {
                latitude: 1,
                longitude: 2,
                country: 'US',
                region: 'CA',
                city: null,
            } as unknown as GeoLocation;

            expect(service.resolveCity(geoLocation)).toBe('Unknown Location');
        });
    });

    describe('resolveDevice', () => {
        it('returns "vendor model" when both are present', () => {
            const userAgent = {
                ua: 'ua',
                browser: null,
                cpu: null,
                device: { type: null, vendor: 'Apple', model: 'iPhone' },
                engine: null,
                os: null,
            } as unknown as UserAgent;

            expect(service.resolveDevice(userAgent)).toBe('Apple iPhone');
        });

        it('falls back to the OS name when device vendor/model is incomplete', () => {
            const userAgent = {
                ua: 'ua',
                browser: null,
                cpu: null,
                device: { type: null, vendor: 'Apple', model: null },
                engine: null,
                os: { name: 'macOS', version: null },
            } as unknown as UserAgent;

            expect(service.resolveDevice(userAgent)).toBe('macOS');
        });

        it('falls back to the browser name when OS name is absent', () => {
            const userAgent = {
                ua: 'ua',
                browser: {
                    name: 'Chrome',
                    version: null,
                    major: null,
                    type: null,
                },
                cpu: null,
                device: null,
                engine: null,
                os: null,
            } as unknown as UserAgent;

            expect(service.resolveDevice(userAgent)).toBe('Chrome');
        });

        it('falls back to "Unknown Device" when nothing resolves', () => {
            const userAgent = {
                ua: null,
                browser: null,
                cpu: null,
                device: null,
                engine: null,
                os: null,
            } as unknown as UserAgent;

            expect(service.resolveDevice(userAgent)).toBe('Unknown Device');
        });
    });
});
