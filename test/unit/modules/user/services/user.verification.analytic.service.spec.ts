import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { EnumVerificationType } from '@generated/prisma-client/client';
import { UserVerificationAnalyticService } from '@modules/user/services/user.verification.analytic.service';
import { UserVerificationAnalyticRepository } from '@modules/user/repositories/user.verification.analytic.repository';

describe('UserVerificationAnalyticService', () => {
    const userVerificationAnalyticRepository: MockProxy<UserVerificationAnalyticRepository> =
        mock<UserVerificationAnalyticRepository>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    let service: UserVerificationAnalyticService;

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserVerificationAnalyticService,
                {
                    provide: UserVerificationAnalyticRepository,
                    useValue: userVerificationAnalyticRepository,
                },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();
        service = module.get(UserVerificationAnalyticService);
    });

    describe('getFunnel', () => {
        it('computes used, unused and rate when both buckets are present', async () => {
            userVerificationAnalyticRepository.groupByUsed.mockResolvedValue([
                { isUsed: true, count: 3 },
                { isUsed: false, count: 7 },
            ]);
            helperNumberService.percent.mockReturnValue(30);

            await expect(
                service.getFunnel(
                    EnumVerificationType.email,
                    startDate,
                    endDate
                )
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
            expect(helperNumberService.percent).toHaveBeenCalledWith(3, 10);
        });

        it('defaults used and unused to zero when their bucket is absent', async () => {
            userVerificationAnalyticRepository.groupByUsed.mockResolvedValue(
                []
            );
            helperNumberService.percent.mockReturnValue(0);

            await expect(
                service.getFunnel(EnumVerificationType.mobileNumber, null, null)
            ).resolves.toEqual({
                used: 0,
                unused: 0,
                total: 0,
                rate: 0,
            });
        });
    });
});
