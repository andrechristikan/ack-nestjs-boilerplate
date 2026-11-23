import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserGuardIsVerifiedMetaKey,
    UserContextStoreKey,
} from '@modules/user/constants/user.constant';
import {
    AuthJwtAccessContextStoreKey,
    AuthJwtRefreshContextStoreKey,
} from '@modules/auth/constants/auth.constant';
import { UserService } from '@modules/user/services/user.service';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import { buildHttpExecutionContext } from '@test/unit/helpers/test.unit.execution-context.helper';
import {
    buildAuthJwtAccessContext,
    buildAuthJwtRefreshContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let guard: UserGuard;

    const role: IRoleWithPolicies = {
        id: 'role-lantern',
        name: 'user',
        description: null,
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        isImmutable: false,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const user: IUser = {
        id: 'user-lantern',
        name: 'Lantern Brooks',
        username: 'lanternBrooks',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'lantern@example.com',
        roleId: 'role-lantern',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-lantern',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: EnumUserLoginFrom.website,
        lastLoginWith: EnumUserLoginWith.credential,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
    };
    const accessContext = buildAuthJwtAccessContext(user.id);
    const refreshContext = buildAuthJwtRefreshContext(user.id, 'refresh-token');

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGuard,
                { provide: Reflector, useValue: reflector },
                { provide: UserService, useValue: userService },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(UserGuard);
    });

    it('validates the guard with verified required when the reflector returns true, and stores the resolved user as the user context', async () => {
        reflector.get.mockReturnValue(true);
        userService.validateUserGuard.mockResolvedValue(user);
        requestStoreService.get.mockImplementation(key =>
            key === AuthJwtAccessContextStoreKey ? accessContext : null
        );
        const context = buildHttpExecutionContext({});

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        expect(requestStoreService.get).toHaveBeenCalledWith(
            AuthJwtAccessContextStoreKey
        );
        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            accessContext,
            true
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            UserContextStoreKey,
            { user }
        );
    });

    it('validates the guard with the refresh context when no access context is stored', async () => {
        reflector.get.mockReturnValue(true);
        userService.validateUserGuard.mockResolvedValue(user);
        requestStoreService.get.mockImplementation(key =>
            key === AuthJwtRefreshContextStoreKey ? refreshContext : null
        );
        const context = buildHttpExecutionContext({});

        await guard.canActivate(context);

        expect(requestStoreService.get).toHaveBeenCalledWith(
            AuthJwtRefreshContextStoreKey
        );
        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            refreshContext,
            true
        );
    });

    it('validates the guard with verified not required when the reflector returns false', async () => {
        reflector.get.mockReturnValue(false);
        userService.validateUserGuard.mockResolvedValue(user);
        requestStoreService.get.mockReturnValue(accessContext);
        const context = buildHttpExecutionContext({});

        await guard.canActivate(context);

        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            accessContext,
            false
        );
    });

    it('defaults verified to false when the reflector returns undefined', async () => {
        reflector.get.mockReturnValue(undefined);
        userService.validateUserGuard.mockResolvedValue(user);
        requestStoreService.get.mockReturnValue(accessContext);
        const context = buildHttpExecutionContext({});

        await guard.canActivate(context);

        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            accessContext,
            false
        );
    });

    it('throws AuthJwtGuardMissingException before the domain call when the store holds no access or refresh context', async () => {
        reflector.get.mockReturnValue(true);
        requestStoreService.get.mockReturnValue(null);
        const context = buildHttpExecutionContext({});

        await expect(guard.canActivate(context)).rejects.toMatchObject({
            module: 'auth',
            statusCode: EnumAuthStatusCodeError.jwtGuardMissing,
            statusCodeKey:
                EnumAuthStatusCodeError[
                    EnumAuthStatusCodeError.jwtGuardMissing
                ],
            messagePath: 'auth.error.jwtGuardMissing',
            httpStatus: HttpStatus.UNAUTHORIZED,
        });
        expect(userService.validateUserGuard).not.toHaveBeenCalled();
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
