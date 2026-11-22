import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyAnalyticService } from '@modules/term-policy/services/term-policy.analytic.service';
import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';

describe('TermPolicyAnalyticService', () => {
    const termPolicyAnalyticRepository: MockProxy<TermPolicyAnalyticRepository> =
        mock<TermPolicyAnalyticRepository>();

    let service: TermPolicyAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAnalyticService,
                {
                    provide: TermPolicyAnalyticRepository,
                    useValue: termPolicyAnalyticRepository,
                },
            ],
        }).compile();

        service = module.get(TermPolicyAnalyticService);
    });

    describe('getLatestPublishedByTypes', () => {
        it('returns the latest published version per type from the repository', async () => {
            const latest = [{ type: EnumTermPolicyType.privacy, version: 2 }];
            termPolicyAnalyticRepository.groupLatestPublishedByTypes.mockResolvedValue(
                latest
            );

            const result = await service.getLatestPublishedByTypes([
                EnumTermPolicyType.privacy,
            ]);

            expect(result).toBe(latest);
            expect(
                termPolicyAnalyticRepository.groupLatestPublishedByTypes
            ).toHaveBeenCalledWith([EnumTermPolicyType.privacy]);
        });
    });
});
