import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';

describe('HealthAwsSESIndicator', () => {
    const awsSESService: MockProxy<AwsSESService> = mock<AwsSESService>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthAwsSESIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthAwsSESIndicator,
                { provide: AwsSESService, useValue: awsSESService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthAwsSESIndicator);
    });

    describe('isHealthy', () => {
        it('reports up when the connection check resolves true', async () => {
            awsSESService.checkConnection.mockResolvedValue(true);
            session.up.mockReturnValue({ ses: { status: 'up' } });

            const result = await indicator.isHealthy('ses');

            expect(result).toEqual({ ses: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith('ses');
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down when the connection check resolves false', async () => {
            awsSESService.checkConnection.mockResolvedValue(false);
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy('ses');

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAwsSESIndicator Failed - Connection to AWS SES failed'
            );
        });

        it('reports down with the error message when the connection check throws an Error', async () => {
            awsSESService.checkConnection.mockRejectedValue(
                new Error('SES unreachable')
            );
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy('ses');

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAwsSESIndicator Failed - SES unreachable'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            awsSESService.checkConnection.mockRejectedValue('not-an-error');
            session.down.mockReturnValue({ ses: { status: 'down' } });

            const result = await indicator.isHealthy('ses');

            expect(result).toEqual({ ses: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthAwsSESIndicator Failed - Unknown error'
            );
        });
    });
});
