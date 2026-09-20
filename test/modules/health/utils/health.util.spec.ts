import { describe, expect, it } from 'vitest';

import { EnumHealthStatus } from '@modules/health/enums/health.enum';
import { HealthUtil } from '@modules/health/utils/health.util';

describe('HealthUtil', () => {
    const util = new HealthUtil();
    const valid = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
    };

    describe('isHealthCheckResult', () => {
        it('accepts an object with a string status and all three indicator maps', () => {
            expect(util.isHealthCheckResult(valid)).toBe(true);
        });

        it('rejects a string', () => {
            expect(util.isHealthCheckResult('ok')).toBe(false);
        });

        it.each(['status', 'info', 'error', 'details'])(
            'rejects an object missing %s',
            key => {
                const value: Record<string, unknown> = { ...valid };
                delete value[key];

                expect(util.isHealthCheckResult(value)).toBe(false);
            }
        );

        it('rejects a non-string status', () => {
            expect(util.isHealthCheckResult({ ...valid, status: 1 })).toBe(
                false
            );
        });

        it.each(['info', 'error', 'details'])('rejects a null %s map', key => {
            expect(util.isHealthCheckResult({ ...valid, [key]: null })).toBe(
                false
            );
        });

        it.each(['info', 'error', 'details'])(
            'rejects a non-object %s map',
            key => {
                expect(
                    util.isHealthCheckResult({ ...valid, [key]: 'up' })
                ).toBe(false);
            }
        );
    });

    describe('mapStatus', () => {
        it.each([
            ['ok', EnumHealthStatus.ok],
            ['degraded', EnumHealthStatus.degraded],
            ['error', EnumHealthStatus.error],
            ['shutting_down', EnumHealthStatus.shuttingDown],
        ] as const)('maps %s', (status, expected) => {
            expect(util.mapStatus(status)).toBe(expected);
        });
    });
});
