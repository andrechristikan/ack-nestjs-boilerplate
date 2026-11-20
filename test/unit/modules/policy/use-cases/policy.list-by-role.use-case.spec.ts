import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { PolicyListByRoleUseCase } from '@modules/policy/use-cases/policy.list-by-role.use-case';

describe('PolicyListByRoleUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();

    const policy: Policy = {
        id: 'policy-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        roleId: 'role-1',
        subject: EnumPolicySubject.user,
        action: [EnumPolicyAction.manage],
    };

    const role: IRoleWithPolicies = {
        id: 'role-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        name: 'admin',
        description: null,
        type: EnumRoleType.admin,
        isImmutable: false,
        policies: [policy],
    };

    let useCase: PolicyListByRoleUseCase;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyListByRoleUseCase,
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        useCase = module.get(PolicyListByRoleUseCase);
    });

    describe('execute', () => {
        it('rethrows the role not found failure', async () => {
            const failure = new RoleNotFoundException();
            roleService.getOneWithPolicies.mockRejectedValue(failure);

            const promise = useCase.execute('role-1');

            await expect(promise).rejects.toBe(failure);
            expect(roleService.getOneWithPolicies).toHaveBeenCalledWith(
                'role-1'
            );
        });

        it('wraps the policies of the role in the response envelope after one role read', async () => {
            roleService.getOneWithPolicies.mockResolvedValue(role);

            const result = await useCase.execute('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(roleService.getOneWithPolicies).toHaveBeenCalledTimes(1);
            expect(roleService.getOne).not.toHaveBeenCalled();
        });
    });
});
