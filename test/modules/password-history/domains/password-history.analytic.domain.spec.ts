import { Test } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import { EnumPasswordHistoryType } from '@generated/prisma-client/client';
import { PasswordHistoryAnalyticDomain } from '@modules/password-history/domains/password-history.analytic.domain';
import type { IPasswordHistoryAnalytic } from '@modules/password-history/interfaces/password-history.interface';
import { PasswordHistoryAnalyticRepository } from '@modules/password-history/repositories/password-history.analytic.repository';

describe('PasswordHistoryAnalyticDomain', () => {
    const passwordHistoryAnalyticRepository =
        mock<PasswordHistoryAnalyticRepository>();
    let domain: PasswordHistoryAnalyticDomain;

    const startDate = new Date('2024-01-01T00:00:00.000Z');
    const endDate = new Date('2024-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                PasswordHistoryAnalyticDomain,
                {
                    provide: PasswordHistoryAnalyticRepository,
                    useValue: passwordHistoryAnalyticRepository,
                },
            ],
        }).compile();
        domain = module.get(PasswordHistoryAnalyticDomain);
    });

    describe('countByTypeInRange', () => {
        it('returns the count from the repository', async () => {
            passwordHistoryAnalyticRepository.countByTypeInRange.mockResolvedValue(
                7
            );

            const result = await domain.countByTypeInRange(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );

            expect(result).toBe(7);
            expect(
                passwordHistoryAnalyticRepository.countByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });
    });

    describe('findByTypeInRange', () => {
        it('returns the rows from the repository', async () => {
            const rows: IPasswordHistoryAnalytic[] = [
                {
                    id: 'history-id',
                    userId: 'user-id',
                    type: EnumPasswordHistoryType.admin,
                    createdAt: startDate,
                },
            ];
            passwordHistoryAnalyticRepository.findByTypeInRange.mockResolvedValue(
                rows
            );

            const result = await domain.findByTypeInRange(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );

            expect(result).toBe(rows);
            expect(
                passwordHistoryAnalyticRepository.findByTypeInRange
            ).toHaveBeenCalledWith(
                EnumPasswordHistoryType.admin,
                startDate,
                endDate
            );
        });
    });
});
