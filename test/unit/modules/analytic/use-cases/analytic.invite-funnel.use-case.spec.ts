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
import { AnalyticInviteFunnelUseCase } from '@modules/analytic/use-cases/analytic.invite-funnel.use-case';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('AnalyticInviteFunnelUseCase', () => {
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

    let useCase: AnalyticInviteFunnelUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                AnalyticInviteFunnelUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
                { provide: AnalyticDateService, useValue: analyticDateService },
            ],
        }).compile();

        useCase = module.get(AnalyticInviteFunnelUseCase);
    });

    describe('execute', () => {
        it('authorizes the read of the workspace analytic before any service call', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.inviteFunnel.mockResolvedValue([]);

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
            expect(analyticDateService.requireRange).not.toHaveBeenCalled();
            expect(
                analyticWorkspaceUserService.inviteFunnel
            ).not.toHaveBeenCalled();
        });

        it('wraps the domain result in the response envelope', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.inviteFunnel.mockResolvedValue([
                { status: 'pending', count: 2 },
            ]);

            const result = await useCase.execute(
                workspaceContext,
                policyContext,
                {
                    startDate,
                    endDate,
                }
            );

            expect(result).toEqual({
                data: { statuses: [{ status: 'pending', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserService.inviteFunnel
            ).toHaveBeenCalledWith('workspace-1', startDate, endDate);
        });

        it('passes the query dates to the range check', async () => {
            analyticDateService.requireRange.mockReturnValue({
                startDate,
                endDate,
            });
            analyticWorkspaceUserService.inviteFunnel.mockResolvedValue([]);

            await useCase.execute(workspaceContext, policyContext, {
                startDate,
                endDate,
            });

            expect(analyticDateService.requireRange).toHaveBeenCalledWith(
                startDate,
                endDate
            );
        });
    });
});
