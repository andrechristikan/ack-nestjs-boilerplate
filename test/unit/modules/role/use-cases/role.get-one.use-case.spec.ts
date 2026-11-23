import {
    buildPolicyAbility,
    buildPolicyContext,
} from '@test/unit/helpers/test.unit.policy.helper';
import { EnumRoleScope } from '@generated/prisma-client/client';
import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { Role } from '@generated/prisma-client/client';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import { PolicyAbilityService } from '@modules/policy/services/policy.ability.service';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { RoleGetOneUseCase } from '@modules/role/use-cases/role.get-one.use-case';
import type { IPolicyWhereInput } from '@modules/policy/interfaces/policy.interface';

describe('RoleGetOneUseCase', () => {
    const policyContext = buildPolicyContext(buildPolicyAbility([]));
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const policyAbilityService: MockProxy<PolicyAbilityService> =
        mock<PolicyAbilityService>();
    const where: IPolicyWhereInput<'Role'> = { scope: EnumRoleScope.platform };

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.admin,
        policyRevision: 0,
        isImmutable: false,
        createdAt: now,
        createdBy: 'user-1',
        updatedAt: now,
        updatedBy: 'user-1',
    };
    const roleWithPolicies: IRoleWithPolicies = { ...role, policies: [] };

    let useCase: RoleGetOneUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();
        policyAbilityService.scope.mockReturnValue(where);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGetOneUseCase,
                { provide: RoleService, useValue: roleService },
                {
                    provide: PolicyAbilityService,
                    useValue: policyAbilityService,
                },
            ],
        }).compile();

        useCase = module.get(RoleGetOneUseCase);
    });

    describe('execute', () => {
        it('wraps the domain role in the response envelope', async () => {
            roleService.getOneWithPolicies.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(
                policyContext,
                roleWithPolicies.id
            );

            expect(result).toEqual({ data: roleWithPolicies });
            expect(policyAbilityService.scope).toHaveBeenCalledWith(
                policyContext,
                EnumPolicyAction.read,
                EnumPolicySubject.Role
            );
            expect(roleService.getOneWithPolicies).toHaveBeenCalledWith(
                roleWithPolicies.id,
                where
            );
        });
    });
});
