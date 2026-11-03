import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyAnalyticDomain } from '@modules/term-policy/domains/term-policy.analytic.domain';
import { TermPolicyAnalyticRepository } from '@modules/term-policy/repositories/term-policy.analytic.repository';

describe('TermPolicyAnalyticDomain', () => {
    const termPolicyAnalyticRepository: MockProxy<TermPolicyAnalyticRepository> =
        mock<TermPolicyAnalyticRepository>();

    let domain: TermPolicyAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAnalyticDomain,
                {
                    provide: TermPolicyAnalyticRepository,
                    useValue: termPolicyAnalyticRepository,
                },
            ],
        }).compile();

        domain = module.get(TermPolicyAnalyticDomain);
    });

    describe('getLatestPublishedByTypes', () => {
        it('returns the latest published version per type from the repository', async () => {
            const latest = [{ type: EnumTermPolicyType.privacy, version: 2 }];
            termPolicyAnalyticRepository.groupLatestPublishedByTypes.mockResolvedValue(
                latest
            );

            const result = await domain.getLatestPublishedByTypes([
                EnumTermPolicyType.privacy,
            ]);

            expect(result).toBe(latest);
            expect(
                termPolicyAnalyticRepository.groupLatestPublishedByTypes
            ).toHaveBeenCalledWith([EnumTermPolicyType.privacy]);
        });
    });
});
