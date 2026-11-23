import { EnumPolicyAction } from '@generated/prisma-client/client';
import { PolicyForbiddenException } from '@modules/policy/exceptions/policy.forbidden.exception';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { EnumRoleWorkspaceKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AnalyticWorkspaceUserService } from '@modules/analytic/services/analytic.workspace-user.service';
import { AnalyticDateService } from '@modules/analytic/services/analytic.date.service';
import { AnalyticSummaryUseCase } from '@modules/analytic/use-cases/analytic.summary.use-case';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('AnalyticSummaryUseCase', () => {
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1', EnumRoleWorkspaceKey.admin)
    );
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const analyticWorkspaceUserService: MockProxy<AnalyticWorkspaceUserService> =
        mock<AnalyticWorkspaceUserService>();

    const analyticDateService: MockProxy<AnalyticDateService> =
        mock<AnalyticDateService>();

    const startDate: Date = new Date('2026-01-01T00:00:00.000Z');

    const endDate: Date = new Date('2026-02-01T00:00:00.000Z');

    let useCase: AnalyticSummaryUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                AnalyticSummaryUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticSummaryUseCase);
    });

    describe('execute', () => {
        it('authorizes the read of the workspace analytic before any service call', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.summary.mockResolvedValue({
                memberCount: 0,
                projectCount: 0,
                activityCount: 0,
            });

            await useCase.execute(workspaceContext, policyContext, {
                startDate,
                endDate,
            });

            expect(policyAbilityService.authorize).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                expect.objectContaining({
                    __caslSubjectType__: 'WorkspaceAnalytic',
                    workspaceId: 'workspace-1',
                })
            );
        });

        it('rejects with the forbidden error and calls no service when the ability denies the read', async () => {
            policyAbilityService.authorize.mockImplementation(() => {
                throw new PolicyForbiddenException();
            });

            await expect(
                useCase.execute(workspaceContext, policyContext, {
                    startDate,
                    endDate,
                })
            ).rejects.toThrow(PolicyForbiddenException);
            expect(analyticDateService.optionalRange).not.toHaveBeenCalled();
            expect(analyticWorkspaceUserService.summary).not.toHaveBeenCalled();
        });

        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.summary.mockResolvedValue({
                memberCount: 3,
                projectCount: 2,
                activityCount: 9,
            });

            const result = await useCase.execute(
                workspaceContext,
                policyContext,
                {
                    startDate,
                    endDate,
                }
            );

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
            expect(result).toEqual({
                data: { memberCount: 3, projectCount: 2, activityCount: 9 },
            });
            expect(analyticWorkspaceUserService.summary).toHaveBeenCalledWith(
                'workspace-1',
                startDate,
                endDate
            );
        });

        it('passes null dates when the optional range is empty', async () => {
            analyticDateService.optionalRange.mockReturnValue({
                startDate: null,
                endDate: null,
            });
            analyticWorkspaceUserService.summary.mockResolvedValue({
                memberCount: 0,
                projectCount: 0,
                activityCount: 0,
            });

            await useCase.execute(workspaceContext, policyContext, {});

            expect(analyticDateService.optionalRange).toHaveBeenCalledWith(
                null,
                null
            );
            expect(analyticWorkspaceUserService.summary).toHaveBeenCalledWith(
                'workspace-1',
                null,
                null
            );
        });
    });
});
