import { mock } from 'vitest-mock-extended';

import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';
import { createHealthIndicatorHarness } from '@test/modules/health/indicators/health.indicator.spec-helper';

vi.mock('@common/firebase/services/firebase.service', () => ({
    FirebaseService: class {},
}));

describe('HealthFirebaseIndicator', () => {
    const firebase = mock<FirebaseService>();

    it.each([
        [true, 'up'],
        [false, 'down'],
    ] as const)('maps initialized state %s', async (initialized, state) => {
        const harness = createHealthIndicatorHarness();
        const indicator = new HealthFirebaseIndicator(firebase, harness.health);
        firebase.isInitialized.mockReturnValue(initialized);
        await expect(indicator.isHealthy('firebase')).resolves.toBe(
            harness[state]
        );
        expect(harness.health.check).toHaveBeenCalledWith('firebase');
    });

    it.each([
        [new Error('failure'), 'failure'],
        ['failure', 'Unknown error'],
    ])('maps initialization errors', async (error, message) => {
        const { health, session, down } = createHealthIndicatorHarness();
        const indicator = new HealthFirebaseIndicator(firebase, health);
        firebase.isInitialized.mockImplementationOnce(() => {
            throw error;
        });
        await expect(indicator.isHealthy('firebase')).resolves.toBe(down);
        expect(session.down).toHaveBeenCalledWith(
            `HealthFirebaseIndicator Failed - ${message}`
        );
    });
});
