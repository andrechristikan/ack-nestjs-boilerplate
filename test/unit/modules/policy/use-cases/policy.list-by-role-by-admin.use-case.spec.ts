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
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyListByRoleByAdminUseCase } from '@modules/policy/use-cases/policy.list-by-role-by-admin.use-case';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('PolicyListByRoleByAdminUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const where: IPolicyWhereInput<'Role'> = { scope: EnumRoleScope.platform };
    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.User,
        action: [EnumPolicyAction.read],
        conditions: null,
        inverted: false,
        reason: null,
    };

    let useCase: PolicyListByRoleByAdminUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyListByRoleByAdminUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(PolicyListByRoleByAdminUseCase);
    });

    describe('execute', () => {
        it('lists the policies of a role the read predicate reaches', async () => {
            policyService.getManyByRole.mockResolvedValue([policy]);

            const result = await useCase.execute(policyContext, 'role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.Role
            );
            expect(roleService.assertExistsById).toHaveBeenCalledWith(
                'role-1',
                where
            );
        });

        it('reads no policy when the role is unreachable', async () => {
            roleService.assertExistsById.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(policyContext, 'role-1')
            ).rejects.toThrow(RoleNotFoundException);
            expect(policyService.getManyByRole).not.toHaveBeenCalled();
        });
    });
});
