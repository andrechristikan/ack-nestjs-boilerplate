import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { MfaAnalyticService } from '@modules/mfa/services/mfa.analytic.service';
import { MfaAnalyticRepository } from '@modules/mfa/repositories/mfa.analytic.repository';

describe('MfaAnalyticService', () => {
    const mfaAnalyticRepository: MockProxy<MfaAnalyticRepository> =
        mock<MfaAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

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
                {
                    provide: HelperNumberService,
                    useValue: helperNumberService,
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

    describe('mapAdoption', () => {
        it('computes the rate from the enabled count and the active user count', () => {
            helperNumberService.percent.mockReturnValue(50);

            expect(service.mapAdoption(4, 8)).toEqual({
                enabled: 4,
                total: 8,
                rate: 50,
            });
            expect(helperNumberService.percent).toHaveBeenCalledWith(4, 8);
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
