import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { FirebaseService } from '@common/firebase/services/firebase.service';
import { HealthIndicatorService } from '@nestjs/terminus';
import { HealthFirebaseIndicator } from '@modules/health/indicators/health.firebase.indicator';

describe('HealthFirebaseIndicator', () => {
    const firebaseService: MockProxy<FirebaseService> = mock<FirebaseService>();
    const healthIndicatorService: MockProxy<HealthIndicatorService> =
        mock<HealthIndicatorService>();
    const session = { up: vi.fn(), down: vi.fn() };

    let indicator: HealthFirebaseIndicator;

    beforeEach(async () => {
        vi.resetAllMocks();

        healthIndicatorService.check.mockReturnValue(session as never);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                HealthFirebaseIndicator,
                { provide: FirebaseService, useValue: firebaseService },
                {
                    provide: HealthIndicatorService,
                    useValue: healthIndicatorService,
                },
            ],
        }).compile();

        indicator = module.get(HealthFirebaseIndicator);
    });

    describe('isHealthy', () => {
        it('reports up when the Admin SDK finished initializing', async () => {
            firebaseService.isInitialized.mockReturnValue(true);
            session.up.mockReturnValue({ firebase: { status: 'up' } });

            const result = await indicator.isHealthy('firebase');

            expect(result).toEqual({ firebase: { status: 'up' } });
            expect(healthIndicatorService.check).toHaveBeenCalledWith(
                'firebase'
            );
            expect(session.up).toHaveBeenCalledWith();
        });

        it('reports down as not configured when the Admin SDK is not initialized', async () => {
            firebaseService.isInitialized.mockReturnValue(false);
            session.down.mockReturnValue({ firebase: { status: 'down' } });

            const result = await indicator.isHealthy('firebase');

            expect(result).toEqual({ firebase: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'Firebase is not configured'
            );
        });

        it('reports down with the error message when the check throws an Error', async () => {
            firebaseService.isInitialized.mockImplementation(() => {
                throw new Error('sdk crashed');
            });
            session.down.mockReturnValue({ firebase: { status: 'down' } });

            const result = await indicator.isHealthy('firebase');

            expect(result).toEqual({ firebase: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthFirebaseIndicator Failed - sdk crashed'
            );
        });

        it('reports down with an unknown-error message when a non-Error is thrown', async () => {
            firebaseService.isInitialized.mockImplementation(() => {
                throw 'not-an-error';
            });
            session.down.mockReturnValue({ firebase: { status: 'down' } });

            const result = await indicator.isHealthy('firebase');

            expect(result).toEqual({ firebase: { status: 'down' } });
            expect(session.down).toHaveBeenCalledWith(
                'HealthFirebaseIndicator Failed - Unknown error'
            );
        });
    });
});
