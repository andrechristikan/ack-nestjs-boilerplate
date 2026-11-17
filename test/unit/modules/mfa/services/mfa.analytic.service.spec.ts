import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { MfaAnalyticService } from '@modules/mfa/services/mfa.analytic.service';
import { MfaAnalyticRepository } from '@modules/mfa/repositories/mfa.analytic.repository';

describe('MfaAnalyticService', () => {
    const mfaAnalyticRepository: MockProxy<MfaAnalyticRepository> =
        mock<MfaAnalyticRepository>();

    let service: MfaAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MfaAnalyticService,
                {
                    provide: MfaAnalyticRepository,
                    useValue: mfaAnalyticRepository,
                },
            ],
        }).compile();
        service = module.get(MfaAnalyticService);
    });

    describe('getEnabledCount', () => {
        it('delegates the enabled count to the repository', async () => {
            mfaAnalyticRepository.countEnabled.mockResolvedValue(4);

            await expect(service.getEnabledCount()).resolves.toBe(4);
        });
    });

    describe('getAttemptSnapshot', () => {
        it('delegates to the repository', async () => {
            const snapshot = { usersWithAttempts: 2, totalAttempts: 5 };
            mfaAnalyticRepository.findAttemptSnapshot.mockResolvedValue(
                snapshot
            );

            await expect(service.getAttemptSnapshot()).resolves.toBe(snapshot);
        });
    });
});
