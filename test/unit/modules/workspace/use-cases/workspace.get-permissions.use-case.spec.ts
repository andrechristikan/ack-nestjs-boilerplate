import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { WorkspaceGetPermissionsUseCase } from '@modules/workspace/use-cases/workspace.get-permissions.use-case';

describe('WorkspaceGetPermissionsUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();

    let useCase: WorkspaceGetPermissionsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspaceGetPermissionsUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(WorkspaceGetPermissionsUseCase);
    });

    describe('execute', () => {
        it('answers the effective permissions over the workspace subjects', async () => {
            const permissions = [
                {
                    subject: EnumPolicySubject.Workspace,
                    actions: [EnumPolicyAction.read],
                },
            ];
            policyAbilityService.getEffectivePermissions.mockReturnValue(
                permissions
            );

            const result = await useCase.execute(policyContext);

            expect(result).toEqual({ data: { permissions } });
            expect(
                policyAbilityService.getEffectivePermissions
            ).toHaveBeenCalledWith(policyContext, [
                EnumPolicySubject.Workspace,
                EnumPolicySubject.WorkspaceMember,
                EnumPolicySubject.WorkspaceInvite,
                EnumPolicySubject.WorkspaceJoinRequest,
                EnumPolicySubject.Project,
                EnumPolicySubject.ProjectMember,
                EnumPolicySubject.WorkspaceAnalytic,
            ]);
        });
    });
});
