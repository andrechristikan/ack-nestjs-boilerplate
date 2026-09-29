import type { ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { Policy } from '@generated/prisma-client/client';
import { PolicyStoreKey } from '@modules/policy/constants/policy.constant';
import { RoleRequiredMetaKey } from '@modules/role/constants/role.constant';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleGuard } from '@modules/role/guards/role.guard';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { UserStoreKey } from '@modules/user/constants/user.constant';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';

describe('RoleGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const executionContext = mock<ExecutionContext>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const role: IRoleWithPolicies = {
        id: 'role-1',
        name: 'manager',
        description: null,
        type: EnumRoleType.user,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        policies: [],
    };
    const user: IUser = {
        id: 'user-1',
        name: null,
        username: 'johnson',
        isVerified: false,
        verifiedAt: null,
        email: 'john@example.com',
        roleId: role.id,
        password: null,
        passwordExpired: null,
        passwordCreated: null,
        passwordAttempt: null,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-1',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
        photo: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        twoFactor: null,
    };
    const policies: Policy[] = [];

    let guard: RoleGuard;

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleGuard,
                { provide: Reflector, useValue: reflector },
                { provide: RoleDomain, useValue: roleDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();

        guard = module.get(RoleGuard);
    });

    describe('canActivate', () => {
        it('reads the required roles and stored user, delegates to the domain, and stores the resolved policies', async () => {
            reflector.get.mockReturnValue([EnumRoleType.user]);
            requestStoreService.get.mockReturnValue(user);
            roleDomain.validateRoleGuard.mockResolvedValue(policies);

            const result = await guard.canActivate(executionContext);

            expect(result).toBe(true);
            expect(reflector.get).toHaveBeenCalledWith(
                RoleRequiredMetaKey,
                executionContext.getHandler()
            );
            expect(requestStoreService.get).toHaveBeenCalledWith(UserStoreKey);
            expect(roleDomain.validateRoleGuard).toHaveBeenCalledWith(user, [
                EnumRoleType.user,
            ]);
            expect(requestStoreService.set).toHaveBeenCalledWith(
                PolicyStoreKey,
                policies
            );
        });

        it('defaults required roles to an empty array when no metadata is set', async () => {
            reflector.get.mockReturnValue(undefined);
            requestStoreService.get.mockReturnValue(null);
            roleDomain.validateRoleGuard.mockResolvedValue([]);

            await guard.canActivate(executionContext);

            expect(roleDomain.validateRoleGuard).toHaveBeenCalledWith(null, []);
        });

        it('propagates a thrown exception from the domain', async () => {
            reflector.get.mockReturnValue([]);
            requestStoreService.get.mockReturnValue(null);
            const error = new Error('forbidden');
            roleDomain.validateRoleGuard.mockRejectedValue(error);

            await expect(guard.canActivate(executionContext)).rejects.toBe(
                error
            );
        });
    });
});
