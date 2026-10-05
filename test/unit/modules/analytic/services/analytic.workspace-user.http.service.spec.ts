import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceUserDomain } from '@modules/analytic/domains/analytic.workspace-user.domain';
import { AnalyticWorkspaceUserHttpService } from '@modules/analytic/services/analytic.workspace-user.http.service';
import { AnalyticDateDomain } from '@modules/analytic/domains/analytic.date.domain';

describe('AnalyticWorkspaceUserHttpService', () => {
    const analyticWorkspaceUserDomain: MockProxy<AnalyticWorkspaceUserDomain> =
        mock<AnalyticWorkspaceUserDomain>();
    const analyticDateDomain: MockProxy<AnalyticDateDomain> =
        mock<AnalyticDateDomain>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');
    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let service: AnalyticWorkspaceUserHttpService;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AnalyticWorkspaceUserHttpService,
                {
                    provide: AnalyticWorkspaceUserDomain,
                    useValue: analyticWorkspaceUserDomain,
                },
                { provide: AnalyticDateDomain, useValue: analyticDateDomain },
            ],
        }).compile();

        service = module.get(AnalyticWorkspaceUserHttpService);
    });

    describe('summary', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.summary.mockResolvedValue({
                memberCount: 3,
                projectCount: 2,
                activityCount: 9,
            });

            const result = await service.summary(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { memberCount: 3, projectCount: 2, activityCount: 9 },
            });
            expect(analyticWorkspaceUserDomain.summary).toHaveBeenCalledWith(
                'workspace-1',
                startDate,
                endDate
            );
        });

        it('passes undefined dates when the optional range is empty', async () => {
            analyticDateDomain.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticWorkspaceUserDomain.summary.mockResolvedValue({
                memberCount: 0,
                projectCount: 0,
                activityCount: 0,
            });

            await service.summary('workspace-1');

            expect(analyticDateDomain.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );
            expect(analyticWorkspaceUserDomain.summary).toHaveBeenCalledWith(
                'workspace-1',
                undefined,
                undefined
            );
        });
    });

    describe('inviteFunnel', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.inviteFunnel.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await service.inviteFunnel(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserDomain.inviteFunnel
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });

        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.inviteFunnel.mockResolvedValue([]);

            await service.inviteFunnel('workspace-1');

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('joinOutcomes', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.joinOutcomes.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await service.joinOutcomes(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserDomain.joinOutcomes
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });

        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.joinOutcomes.mockResolvedValue([]);

            await service.joinOutcomes('workspace-1');

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });

    describe('memberRoles', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticWorkspaceUserDomain.memberRoles.mockResolvedValue([
                { role: 'admin', count: 2 },
            ]);

            const result = await service.memberRoles('workspace-1');

            expect(result).toEqual({
                data: { roles: [{ role: 'admin', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserDomain.memberRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });

    describe('activity', () => {
        it('wraps the domain result in the response envelope', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.activity.mockResolvedValue({
                count: 12,
            });

            const result = await service.activity(
                'workspace-1',
                startDate,
                endDate
            );

            expect(result).toEqual({ data: { count: 12 } });
            expect(analyticWorkspaceUserDomain.activity).toHaveBeenCalledWith(
                'workspace-1',
                startDate,
                endDate
            );
        });

        it('passes null when dates are omitted', async () => {
            analyticDateDomain.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserDomain.activity.mockResolvedValue({
                count: 0,
            });

            await service.activity('workspace-1');

            expect(analyticDateDomain.requireRange).toHaveBeenCalledWith(
                null,
                null
            );
        });
    });
});
