import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthUtil } from '@modules/health/utils/health.util';

describe('HealthUtil', () => {
    let util: HealthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [HealthUtil],
        }).compile();

        util = module.get(HealthUtil);
    });

    describe('isHealthCheckResult', () => {
        it('returns false when the value is not an object', () => {
            expect(util.isHealthCheckResult('not-an-object')).toBe(false);
        });

        it('returns false when status is missing', () => {
            expect(util.isHealthCheckResult({})).toBe(false);
        });

        it('returns false when status is not a string', () => {
            expect(
                util.isHealthCheckResult({
                    status: 200,
                    info: {},
                    error: {},
                    details: {},
                })
            ).toBe(false);
        });

        it('returns false when info is missing', () => {
            expect(util.isHealthCheckResult({ status: 'ok' })).toBe(false);
        });

        it('returns false when error is missing', () => {
            expect(util.isHealthCheckResult({ status: 'ok', info: {} })).toBe(
                false
            );
        });

        it('returns false when details is missing', () => {
            expect(
                util.isHealthCheckResult({
                    status: 'ok',
                    info: {},
                    error: {},
                })
            ).toBe(false);
        });

        it('returns false when info is not an object', () => {
            expect(
                util.isHealthCheckResult({
                    status: 'ok',
                    info: 'not-an-object',
                    error: {},
                    details: {},
                })
            ).toBe(false);
        });

        it('returns false when error is not an object', () => {
            expect(
                util.isHealthCheckResult({
                    status: 'ok',
                    info: {},
                    error: 'not-an-object',
                    details: {},
                })
            ).toBe(false);
        });

        it('returns false when details is not an object', () => {
            expect(
                util.isHealthCheckResult({
                    status: 'ok',
                    info: {},
                    error: {},
                    details: 'not-an-object',
                })
            ).toBe(false);
        });

        it('returns true when status, info, error, and details are present and shaped', () => {
            expect(
                util.isHealthCheckResult({
                    status: 'ok',
                    info: { database: { status: 'up' } },
                    error: {},
                    details: { database: { status: 'up' } },
                })
            ).toBe(true);
        });
    });

    describe('mapStatus', () => {
        it('maps ok to EnumHealthStatus.ok', () => {
            expect(util.mapStatus('ok')).toBe(EnumHealthStatus.ok);
        });

        it('maps degraded to EnumHealthStatus.degraded', () => {
            expect(util.mapStatus('degraded')).toBe(EnumHealthStatus.degraded);
        });

        it('maps error to EnumHealthStatus.error', () => {
            expect(util.mapStatus('error')).toBe(EnumHealthStatus.error);
        });

        it('maps shutting_down to EnumHealthStatus.shuttingDown', () => {
            expect(util.mapStatus('shutting_down')).toBe(
                EnumHealthStatus.shuttingDown
            );
        });
    });

    describe('isIndicatorMap', () => {
        it('returns true for a plain object', () => {
            expect(util['isIndicatorMap']({})).toBe(true);
        });

        it('returns false for null', () => {
            expect(util['isIndicatorMap'](null)).toBe(false);
        });

        it('returns false for a non-object value', () => {
            expect(util['isIndicatorMap']('not-an-object')).toBe(false);
        });
    });
});
