import { mock } from 'vitest-mock-extended';

import { AwsSESService } from '@common/aws/services/aws.ses.service';
import { HealthAwsSESIndicator } from '@modules/health/indicators/health.aws-ses.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

describe('HealthAwsSESIndicator', () => {
    const ses = mock<AwsSESService>();

    beforeEach(() => vi.resetAllMocks());

    it.each([
        [true, 'up'],
        [false, 'down'],
    ] as const)('maps connection state %s', async (connected, state) => {
        const harness = createHealthIndicatorHarness();
        const indicator = new HealthAwsSESIndicator(ses, harness.health);
        ses.checkConnection.mockResolvedValue(connected);
        await expect(indicator.isHealthy('ses')).resolves.toBe(harness[state]);
        expect(harness.health.check).toHaveBeenCalledWith('ses');
    });

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps connection errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthAwsSESIndicator(ses, health);
        ses.checkConnection.mockRejectedValueOnce(error);
        await expect(indicator.isHealthy('ses')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthAwsSESIndicator Failed - ${message}`
        );
    });
});
