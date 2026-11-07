import { HealthQueueFactory } from '@modules/health/factories/health.queue.factory';

describe('HealthQueueFactory', () => {
    describe('createRegisterQueueOptions', () => {
        it('returns no options so the shared queue config applies', () => {
            const factory = new HealthQueueFactory();

            expect(factory.createRegisterQueueOptions()).toEqual({});
        });
    });
});
