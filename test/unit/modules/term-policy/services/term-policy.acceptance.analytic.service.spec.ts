import { HelperNumberService } from '@common/helper/services/helper.number.service';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EnumTermPolicyType } from '@generated/prisma-client/client';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { TermPolicyAcceptanceAnalyticService } from '@modules/term-policy/services/term-policy.acceptance.analytic.service';
import { TermPolicyAnalyticService } from '@modules/term-policy/services/term-policy.analytic.service';
import { TermPolicyAcceptanceAnalyticRepository } from '@modules/term-policy/repositories/term-policy.acceptance.analytic.repository';
import { TermPolicyDefaultRequiredTypes } from '@modules/term-policy/constants/term-policy.constant';
import type { ITermPolicyAcceptanceAnalytic } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyUtil } from '@modules/term-policy/utils/term-policy.util';

describe('TermPolicyAcceptanceAnalyticService', () => {
    const termPolicyAcceptanceAnalyticRepository: MockProxy<TermPolicyAcceptanceAnalyticRepository> =
        mock<TermPolicyAcceptanceAnalyticRepository>();
    const termPolicyAnalyticService: MockProxy<TermPolicyAnalyticService> =
        mock<TermPolicyAnalyticService>();
    const termPolicyUtil: MockProxy<TermPolicyUtil> = mock<TermPolicyUtil>();
    const helperNumberService: MockProxy<HelperNumberService> =
        mock<HelperNumberService>();

    const startDate = new Date('2026-01-01T00:00:00.000Z');
    const endDate = new Date('2026-02-01T00:00:00.000Z');

    let service: TermPolicyAcceptanceAnalyticService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TermPolicyAcceptanceAnalyticService,
                {
                    provide: TermPolicyAcceptanceAnalyticRepository,
                    useValue: termPolicyAcceptanceAnalyticRepository,
                },
                {
                    provide: TermPolicyAnalyticService,
                    useValue: termPolicyAnalyticService,
                },
                {
                    provide: TermPolicyUtil,
                    useValue: termPolicyUtil,
                },
                { provide: HelperNumberService, useValue: helperNumberService },
            ],
        }).compile();

        service = module.get(TermPolicyAcceptanceAnalyticService);
    });

    describe('getAcceptanceRate', () => {
        const latest = [
            { type: EnumTermPolicyType.termsOfService, version: 2 },
            { type: EnumTermPolicyType.privacy, version: 3 },
        ];

        it('counts acceptances of the latest published required versions against active users times those types', async () => {
            termPolicyAnalyticService.getLatestPublishedByTypes.mockResolvedValue(
                latest
            );
            termPolicyAcceptanceAnalyticRepository.countAcceptances.mockResolvedValue(
                40
            );
            helperNumberService.percent.mockReturnValue(100);

            const result = await service.getAcceptanceRate(
                20,
                startDate,
                endDate
            );

            expect(result).toEqual({
                acceptances: 40,
                users: 20,
                published: 2,
                rate: 100,
            });
            expect(
                termPolicyAnalyticService.getLatestPublishedByTypes
            ).toHaveBeenCalledWith(TermPolicyDefaultRequiredTypes);
            expect(
                termPolicyAcceptanceAnalyticRepository.countAcceptances
            ).toHaveBeenCalledWith(latest, startDate, endDate);
            expect(helperNumberService.percent).toHaveBeenCalledWith(40, 40);
        });

        it('passes open date bounds through', async () => {
            termPolicyAnalyticService.getLatestPublishedByTypes.mockResolvedValue(
                latest
            );
            termPolicyAcceptanceAnalyticRepository.countAcceptances.mockResolvedValue(
                0
            );

            await service.getAcceptanceRate(20, null, null);

            expect(
                termPolicyAcceptanceAnalyticRepository.countAcceptances
            ).toHaveBeenCalledWith(latest, null, null);
        });

        it('skips the acceptance count when no required type is published', async () => {
            termPolicyAnalyticService.getLatestPublishedByTypes.mockResolvedValue(
                []
            );
            helperNumberService.percent.mockReturnValue(0);

            const result = await service.getAcceptanceRate(
                20,
                startDate,
                endDate
            );

            expect(result).toEqual({
                acceptances: 0,
                users: 20,
                published: 0,
                rate: 0,
            });
            expect(
                termPolicyAcceptanceAnalyticRepository.countAcceptances
            ).not.toHaveBeenCalled();
            expect(helperNumberService.percent).toHaveBeenCalledWith(0, 0);
        });
    });

    describe('getTimeToAccept', () => {
        it('maps the repository rows through the util average', async () => {
            const rows: ITermPolicyAcceptanceAnalytic[] = [
                {
                    id: 'acceptance-1',
                    userId: 'user-1',
                    termPolicyId: 'term-policy-1',
                    publishedAt: new Date('2026-01-01T00:00:00.000Z'),
                    acceptedAt: new Date('2026-01-01T00:01:00.000Z'),
                },
            ];
            termPolicyAcceptanceAnalyticRepository.findAcceptances.mockResolvedValue(
                rows
            );
            termPolicyUtil.averageAcceptanceMs.mockReturnValue({
                count: 1,
                averageMs: 60000,
            });

            const result = await service.getTimeToAccept(startDate, endDate);

            expect(result).toEqual({ count: 1, averageMs: 60000 });
            expect(
                termPolicyAcceptanceAnalyticRepository.findAcceptances
            ).toHaveBeenCalledWith(startDate, endDate);
            expect(termPolicyUtil.averageAcceptanceMs).toHaveBeenCalledWith(
                rows
            );
        });
    });
});
