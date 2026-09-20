import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    EnumRoleType,
    type Policy,
} from '@generated/prisma-client';
import { PolicyStoreKey } from '@modules/policy/constants/policy.constant';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { RoleGuard } from '@modules/role/guards/role.guard';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserStoreKey } from '@modules/user/constants/user.constant';

describe('RoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const requestStoreGet = vi.mocked(requestStoreService.get);
    const policies = [
        {
            id: 'policy-id',
            roleId: 'role-id',
            subject: EnumPolicySubject.user,
            action: [EnumPolicyAction.read],
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
        },
    ] satisfies Policy[];

    let guard: RoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGuard,
                { provide: Reflector, useValue: reflector },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(RoleGuard);
    });

    it('delegates required roles and stores the returned policies', async () => {
        const handler = () => undefined;
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.getHandler.mockReturnValue(handler);
        const storedUser = { id: 'user-id' };
        reflector.get.mockReturnValue([EnumRoleType.admin]);
        requestStoreGet.mockReturnValue(storedUser);
        roleDomain.validateRoleGuard.mockResolvedValue(policies);

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            RoleRequiredMetaKey,
            handler
        );
        expect(requestStoreGet).toHaveBeenCalledWith(UserStoreKey);
        expect(roleDomain.validateRoleGuard).toHaveBeenCalledWith(storedUser, [
            EnumRoleType.admin,
        ]);
        expect(requestStoreService.set).toHaveBeenCalledWith(
            PolicyStoreKey,
            policies
        );
    });

    it('does not store policies when role validation rejects', async () => {
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        reflector.get.mockReturnValue(undefined);
        requestStoreGet.mockReturnValue(null);
        roleDomain.validateRoleGuard.mockRejectedValue(new Error('forbidden'));

        await expect(guard.canActivate(context)).rejects.toThrow('forbidden');
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
