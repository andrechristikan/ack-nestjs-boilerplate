import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumRoleType } from '@generated/prisma-client/client';
import type { Role } from '@generated/prisma-client/client';
import { RoleService } from '@modules/role/services/role.service';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { RoleGetOneUseCase } from '@modules/role/use-cases/role.get-one.use-case';

describe('RoleGetOneUseCase', () => {
    const roleService: MockProxy<RoleService> = mock<RoleService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: Role = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.admin,
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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGetOneUseCase,
                { provide: RoleService, useValue: roleService },
            ],
        }).compile();

        useCase = module.get(RoleGetOneUseCase);
    });

    describe('execute', () => {
        it('wraps the domain role in the response envelope', async () => {
            roleService.getOne.mockResolvedValue(roleWithPolicies);

            const result = await useCase.execute(roleWithPolicies.id);

            expect(result).toEqual({ data: roleWithPolicies });
            expect(roleService.getOne).toHaveBeenCalledWith(
                roleWithPolicies.id
            );
        });
    });
});
