import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyAcceptanceAnalyticDomain } from '@modules/term-policy/domains/term-policy.acceptance.analytic.domain';
import { TermPolicyAnalyticDomain } from '@modules/term-policy/domains/term-policy.analytic.domain';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import type { ITermPolicyAcceptanceAnalytic } from '@modules/term-policy/interfaces/term-policy.interface';
import { UserAnalyticDomain } from '@modules/user/domains/user.analytic.domain';

describe('TermPolicyAcceptanceAnalyticDomain', () => {
    const termPolicyAcceptanceAnalyticRepository: MockProxy<TermPolicyAcceptanceAnalyticRepository> =
        mock<TermPolicyAcceptanceAnalyticRepository>();
    const termPolicyAnalyticDomain: MockProxy<TermPolicyAnalyticDomain> =
        mock<TermPolicyAnalyticDomain>();
    const userAnalyticDomain: MockProxy<UserAnalyticDomain> =
        mock<UserAnalyticDomain>();

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    let domain: TermPolicyAcceptanceAnalyticDomain;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceAnalyticDomain,
                {
                    provide: TermPolicyAcceptanceAnalyticRepository,
                    useValue: termPolicyAcceptanceAnalyticRepository,
                },
                {
                    provide: TermPolicyAnalyticDomain,
                    useValue: termPolicyAnalyticDomain,
                },
                {
                    provide: UserAnalyticDomain,
                    useValue: userAnalyticDomain,
                },
            ],
        }).compile();

        domain = module.get(TermPolicyAcceptanceAnalyticDomain);
    });

    describe('acceptanceRate', () => {
        it('computes the rate against active users times published policies', async () => {
            termPolicyAcceptanceAnalyticRepository.countAcceptances.mockResolvedValue(
                40
            );
            userAnalyticDomain.countActive.mockResolvedValue(20);
            termPolicyAnalyticDomain.countPublished.mockResolvedValue(2);

            const result = await domain.acceptanceRate(startDate, endDate);

            expect(result).toEqual({
                acceptances: 40,
                users: 20,
                published: 2,
                rate: 100,
            });
            expect(
                termPolicyAcceptanceAnalyticRepository.countAcceptances
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('returns a zero rate when expected acceptances is zero', async () => {
            termPolicyAcceptanceAnalyticRepository.countAcceptances.mockResolvedValue(
                0
            );
            userAnalyticDomain.countActive.mockResolvedValue(0);
            termPolicyAnalyticDomain.countPublished.mockResolvedValue(2);

            const result = await domain.acceptanceRate(null, null);

            expect(result).toEqual({
                acceptances: 0,
                users: 0,
                published: 2,
                rate: 0,
            });
        });
    });

    describe('timeToAccept', () => {
        it('returns zero count and average when no acceptances are found', async () => {
            termPolicyAcceptanceAnalyticRepository.findAcceptances.mockResolvedValue(
                []
            );

            const result = await domain.timeToAccept(startDate, endDate);

            expect(result).toEqual({ count: 0, averageMs: 0 });
        });

        it('averages the acceptance delay across acceptances', async () => {
            const rows: ITermPolicyAcceptanceAnalytic[] = [
                {
                    id: 'acceptance-1',
                    userId: 'user-1',
                    termPolicyId: 'term-policy-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    acceptedAt: new Date('2026-01-01T00:01:00.000Z'),
                },
                {
                    id: 'acceptance-2',
                    userId: 'user-2',
                    termPolicyId: 'term-policy-1',
                    createdAt: new Date('2026-01-01T00:00:00.000Z'),
                    acceptedAt: new Date('2026-01-01T00:03:00.000Z'),
                },
            ];
            termPolicyAcceptanceAnalyticRepository.findAcceptances.mockResolvedValue(
                rows
            );

            const result = await domain.timeToAccept(startDate, endDate);

            expect(result).toEqual({ count: 2, averageMs: 120000 });
        });
    });
});
