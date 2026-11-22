import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { HealthCheckResult } from '@nestjs/terminus';
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

    describe('toResponse', () => {
        it('maps the Terminus status and passes info, error, and details through', () => {
            const result: HealthCheckResult = {
                status: 'degraded',
                info: { database: { status: 'up' } },
                error: { redis: { status: 'down' } },
                details: {
                    database: { status: 'up' },
                    redis: { status: 'down' },
                },
            };

            expect(util.toResponse(result)).toEqual({
                status: EnumHealthStatus.degraded,
                info: result.info,
                error: result.error,
                details: result.details,
            });
        });
    });

    describe('mapStatus', () => {
        it('maps ok to EnumHealthStatus.ok', () => {
            expect(util['mapStatus']('ok')).toBe(EnumHealthStatus.ok);
        });

        it('maps degraded to EnumHealthStatus.degraded', () => {
            expect(util['mapStatus']('degraded')).toBe(
                EnumHealthStatus.degraded
            );
        });

        it('maps error to EnumHealthStatus.error', () => {
            expect(util['mapStatus']('error')).toBe(EnumHealthStatus.error);
        });

        it('maps shutting_down to EnumHealthStatus.shuttingDown', () => {
            expect(util['mapStatus']('shutting_down')).toBe(
                EnumHealthStatus.shuttingDown
            );
        });
    });
});
