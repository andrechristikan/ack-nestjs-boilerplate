import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { UserForgotPasswordAnalyticDomain } from '@modules/user/domains/user.forgot-password.analytic.domain';
import { UserForgotPasswordAnalyticRepository } from '@modules/user/repositories/user.forgot-password.analytic.repository';

describe('UserForgotPasswordAnalyticDomain', () => {
    const userForgotPasswordAnalyticRepository: MockProxy<UserForgotPasswordAnalyticRepository> =
        mock<UserForgotPasswordAnalyticRepository>();

    let domain: UserForgotPasswordAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserForgotPasswordAnalyticDomain,
                {
                    provide: UserForgotPasswordAnalyticRepository,
                    useValue: userForgotPasswordAnalyticRepository,
                },
            ],
        }).compile();
        domain = module.get(UserForgotPasswordAnalyticDomain);
    });

    describe('conversion', () => {
        it('computes the rate when created is not zero', async () => {
            userForgotPasswordAnalyticRepository.countCreated.mockResolvedValue(
                10
            );
            userForgotPasswordAnalyticRepository.countUsed.mockResolvedValue(4);

            await expect(
                domain.conversion(startDate, endDate)
            ).resolves.toEqual({
                created: 10,
                used: 4,
                rate: 40,
            });
            expect(
                userForgotPasswordAnalyticRepository.countCreated
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(
                userForgotPasswordAnalyticRepository.countUsed
            ).toHaveBeenCalledWith(startDate, endDate);
        });

        it('returns a zero rate when created is zero', async () => {
            userForgotPasswordAnalyticRepository.countCreated.mockResolvedValue(
                0
            );
            userForgotPasswordAnalyticRepository.countUsed.mockResolvedValue(0);

            await expect(
                domain.conversion(startDate, endDate)
            ).resolves.toEqual({
                created: 0,
                used: 0,
                rate: 0,
            });
        });
    });

    describe('findCreatedInRange', () => {
        it('delegates to the repository', async () => {
            const rows = [
                {
                    id: 'forgot-1',
                    userId: 'user-1',
                    isUsed: false,
                    createdAt: startDate,
                    to: 'user1@example.com',
                },
            ];
            userForgotPasswordAnalyticRepository.findCreatedInRange.mockResolvedValue(
                rows
            );

            await expect(
                domain.findCreatedInRange(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userForgotPasswordAnalyticRepository.findCreatedInRange
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });

    describe('unusedTokenCountsByUser', () => {
        it('delegates to the repository', async () => {
            const rows = [{ userId: 'user-1', count: 2 }];
            userForgotPasswordAnalyticRepository.unusedTokenCountsByUser.mockResolvedValue(
                rows
            );

            await expect(
                domain.unusedTokenCountsByUser(startDate, endDate)
            ).resolves.toBe(rows);
            expect(
                userForgotPasswordAnalyticRepository.unusedTokenCountsByUser
            ).toHaveBeenCalledWith(startDate, endDate);
        });
    });
});
