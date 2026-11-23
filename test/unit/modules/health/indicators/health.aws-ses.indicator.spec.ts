import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthAwsSesIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { EnumHealthIndicatorKey } from '@modules/health/enums/health.enum';

describe('HealthAwsSesIndicator', () => {
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthAwsSesIndicator;

    beforeEach(async () => {
        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthAwsSesIndicator,
                { provide: AwsSesService, useValue: awsSesService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthAwsSesIndicator);
    });

    describe('isHealthy', () => {
        it('reports down as not configured when SES is not initialized', async () => {
            awsSesService.isInitialized.mockReturnValue(false);
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.ses
            );

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'AWS SES is not configured'
            );
            expect(awsSesService.checkConnection).not.toHaveBeenCalled();
        });

        it('reports up when the connection check resolves true', async () => {
            awsSesService.isInitialized.mockReturnValue(true);
            awsSesService.checkConnection.mockResolvedValue(true);
            session.up.mockReturnValue({ ses: { status: 'up' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.ses
            );

            expect(result).toEqual({ ses: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('ses');
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down when the connection check resolves false', async () => {
            awsSesService.isInitialized.mockReturnValue(true);
            awsSesService.checkConnection.mockResolvedValue(false);
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.ses
            );

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'AWS SES connection failed'
            );
        });

        it('reports down with a fixed message when the connection check throws an Error', async () => {
            awsSesService.isInitialized.mockReturnValue(true);
            awsSesService.checkConnection.mockRejectedValue(
                new Error('SES unreachable')
            );
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.ses
            );

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'AWS SES connection failed'
            );
        });

        it('reports down with the same fixed message when a non-Error is thrown', async () => {
            awsSesService.isInitialized.mockReturnValue(true);
            awsSesService.checkConnection.mockRejectedValue('not-an-error');
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy(
                EnumHealthIndicatorKey.ses
            );

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'AWS SES connection failed'
            );
        });
    });
});
