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
import { ProjectGetPermissionsUseCase } from '@modules/project/use-cases/project.get-permissions.use-case';

describe('ProjectGetPermissionsUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();

    let useCase: ProjectGetPermissionsUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProjectGetPermissionsUseCase,
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(ProjectGetPermissionsUseCase);
    });

    describe('execute', () => {
        it('answers the effective permissions over the project subjects', async () => {
            const permissions = [
                {
                    subject: EnumPolicySubject.Project,
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
                EnumPolicySubject.Project,
                EnumPolicySubject.ProjectMember,
            ]);
        });
    });
});
