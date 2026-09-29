import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
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

    describe('countPublished', () => {
        it('returns the published term-policy count from the repository', async () => {
            termPolicyAnalyticRepository.countPublished.mockResolvedValue(5);

            const result = await domain.countPublished();

            expect(result).toBe(5);
            expect(
                termPolicyAnalyticRepository.countPublished
            ).toHaveBeenCalledWith();
        });
    });
});
