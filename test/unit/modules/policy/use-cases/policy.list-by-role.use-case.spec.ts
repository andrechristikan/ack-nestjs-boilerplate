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
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { PolicyListByRoleUseCase } from '@modules/policy/use-cases/policy.list-by-role.use-case';

describe('PolicyListByRoleUseCase', () => {
    const policyService: MockProxy<PolicyService> = mock<PolicyService>();
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

    let useCase: PolicyListByRoleUseCase;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PolicyListByRoleUseCase,
                { provide: PolicyService, useValue: policyService },
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        useCase = module.get(PolicyListByRoleUseCase);
    });

    describe('execute', () => {
        it('reads nothing when the role gate rejects', async () => {
            const failure = new RoleNotFoundException();
            roleService.assertExistsById.mockRejectedValue(failure);

            const promise = useCase.execute('role-1');

            await expect(promise).rejects.toBe(failure);
            expect(roleService.assertExistsById).toHaveBeenCalledWith('role-1');
            expect(policyService.getManyByRole).not.toHaveBeenCalled();
        });

        it('wraps the policies found for the role in the response envelope', async () => {
            roleService.assertExistsById.mockResolvedValue();
            policyService.getManyByRole.mockResolvedValue([policy]);

            const result = await useCase.execute('role-1');

            expect(result).toEqual({ data: { policies: [policy] } });
            expect(policyService.getManyByRole).toHaveBeenCalledWith('role-1');
        });
    });
});
