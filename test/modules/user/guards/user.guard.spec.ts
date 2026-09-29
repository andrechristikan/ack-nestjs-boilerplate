import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IRequestApp } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserGuard } from '@modules/user/guards/user.guard';
import type { IUser } from '@modules/user/interfaces/user.interface';
import type { IRoleWithPolicies } from '@modules/role/interfaces/role.interface';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

describe('UserGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();

    let guard: UserGuard;

    const role: IRoleWithPolicies = {
        id: 'role-lantern',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        twoFactor: null,
    };
    const jwtPayload: IAuthJwtAccessTokenPayload = {
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
        email: user.email,
        username: user.username,
        userId: user.id,
        sessionId: 'session-lantern',
        deviceOwnershipId: 'device-ownership-lantern',
        roleId: role.id,
    };

    function buildContext(
        request: Partial<IRequestApp>
    ): MockProxy<ExecutionContext> {
        const context = mock<ExecutionContext>();
        context.getHandler.mockReturnValue((): void => {});
        context.switchToHttp.mockReturnValue({
            getRequest: () => request as IRequestApp,
        } as ReturnType<ExecutionContext['switchToHttp']>);

        return context;
    }

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserGuard,
                { provide: Reflector, useValue: reflector },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: RequestStoreService,
                    useValue: requestStoreService,
                },
            ],
        }).compile();
        guard = module.get(UserGuard);
    });

    it('validates the guard with verified required when the reflector returns true, and stores the resolved user', async () => {
        reflector.get.mockReturnValue(true);
        userDomain.validateUserGuard.mockResolvedValue(user);
        const context = buildContext({ user: jwtPayload });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(reflector.get).toHaveBeenCalledWith(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        expect(userDomain.validateUserGuard).toHaveBeenCalledWith(
            user.id,
            true
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            UserStoreKey,
            user
        );
    });

    it('validates the guard with verified not required when the reflector returns false', async () => {
        reflector.get.mockReturnValue(false);
        userDomain.validateUserGuard.mockResolvedValue(user);
        const context = buildContext({ user: jwtPayload });

        await guard.canActivate(context);

        expect(userDomain.validateUserGuard).toHaveBeenCalledWith(
            user.id,
            false
        );
    });

    it('defaults verified to false when the reflector returns undefined', async () => {
        reflector.get.mockReturnValue(undefined);
        userDomain.validateUserGuard.mockResolvedValue(user);
        const context = buildContext({ user: jwtPayload });

        await guard.canActivate(context);

        expect(userDomain.validateUserGuard).toHaveBeenCalledWith(
            user.id,
            false
        );
    });

    it('passes null when the request carries no authenticated user', async () => {
        reflector.get.mockReturnValue(true);
        userDomain.validateUserGuard.mockResolvedValue(user);
        const context = buildContext({ user: undefined });

        await guard.canActivate(context);

        expect(userDomain.validateUserGuard).toHaveBeenCalledWith(null, true);
    });
});
