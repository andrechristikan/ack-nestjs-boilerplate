import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumVerificationType } from '@generated/prisma-client/client';
import { UserVerificationAnalyticDomain } from '@modules/user/domains/user.verification.analytic.domain';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';

describe('UserVerificationAnalyticDomain', () => {
    const userVerificationAnalyticRepository: MockProxy<UserVerificationAnalyticRepository> =
        mock<UserVerificationAnalyticRepository>();

    let domain: UserVerificationAnalyticDomain;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationAnalyticDomain,
                {
                    provide: UserVerificationAnalyticRepository,
                    useValue: userVerificationAnalyticRepository,
                },
            ],
        }).compile();
        domain = module.get(UserVerificationAnalyticDomain);
    });

    describe('getFunnel', () => {
        it('computes used, unused and rate when both buckets are present', async () => {
            userVerificationAnalyticRepository.groupByUsed.mockResolvedValue([
                { isUsed: true, count: 3 },
                { isUsed: false, count: 7 },
            ]);

            await expect(
                domain.getFunnel(EnumVerificationType.email, startDate, endDate)
            ).resolves.toEqual({
                used: 3,
                unused: 7,
                total: 10,
                rate: 30,
            });
            expect(
                userVerificationAnalyticRepository.groupByUsed
            ).toHaveBeenCalledWith(
                EnumVerificationType.email,
                startDate,
                endDate
            );
        });

        it('defaults used and unused to zero when their bucket is absent', async () => {
            userVerificationAnalyticRepository.groupByUsed.mockResolvedValue(
                []
            );

            await expect(
                domain.getFunnel(EnumVerificationType.mobileNumber, null, null)
            ).resolves.toEqual({
                used: 0,
                unused: 0,
                total: 0,
                rate: 0,
            });
        });
    });
});
