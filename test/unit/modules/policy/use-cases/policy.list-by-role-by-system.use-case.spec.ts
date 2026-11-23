import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumPolicyAction,
    EnumPolicySubject,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyService } from '@modules/policy/services/policy.service';
import { PolicyListByRoleBySystemUseCase } from '@modules/policy/use-cases/policy.list-by-role-by-system.use-case';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { RoleService } from '@modules/role/services/role.service';

describe('PolicyListByRoleBySystemUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
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

    let useCase: PolicyListByRoleBySystemUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyListByRoleBySystemUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        useCase = module.get(PolicyListByRoleBySystemUseCase);
    });

    describe('execute', () => {
        it('lists the policies of a role with no read predicate', async () => {
            policyService.getManyByRole.mockResolvedValue([policy]);

            const result = await useCase.execute('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(roleService.assertExistsById).toHaveBeenCalledWith(
                'role-1',
                null
            );
        });

        it('reads no policy when the role does not exist', async () => {
            roleService.assertExistsById.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(useCase.execute('role-1')).rejects.toThrow(
                RoleNotFoundException
            );
            expect(policyService.getManyByRole).not.toHaveBeenCalled();
        });
    });
});
