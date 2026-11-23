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
import { AnalyticMemberRolesUseCase } from '@modules/analytic/use-cases/analytic.member-roles.use-case';
import {
    buildWorkspace,
    buildWorkspaceMember,
    buildWorkspaceContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('AnalyticMemberRolesUseCase', () => {
    const workspaceContext = buildWorkspaceContext(
        buildWorkspace(),
        buildWorkspaceMember('user-1', EnumRoleWorkspaceKey.admin)
    );
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const analyticWorkspaceUserService: MockProxy<AnalyticWorkspaceUserService> =
        mock<AnalyticWorkspaceUserService>();

    let useCase: AnalyticMemberRolesUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
                AnalyticMemberRolesUseCase,
                {
                    provide: AnalyticWorkspaceUserService,
                    useValue: analyticWorkspaceUserService,
                },
            ],
        }).compile();

        useCase = module.get(AnalyticMemberRolesUseCase);
    });

    describe('execute', () => {
        it('authorizes the read of the workspace analytic before any service call', async () => {
            await useCase.execute(workspaceContext, policyContext);

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
                useCase.execute(workspaceContext, policyContext)
            ).rejects.toThrow(PolicyForbiddenException);
            expect(
                analyticWorkspaceUserService.memberRoles
            ).not.toHaveBeenCalled();
        });

        it('wraps the domain result in the response envelope', async () => {
            analyticWorkspaceUserService.memberRoles.mockResolvedValue([
                { role: 'admin', count: 2 },
            ]);

            const result = await useCase.execute(
                workspaceContext,
                policyContext
            );

            expect(result).toEqual({
                data: { roles: [{ role: 'admin', count: 2 }] },
            });
            expect(
                analyticWorkspaceUserService.memberRoles
            ).toHaveBeenCalledWith('workspace-1');
        });
    });
});
