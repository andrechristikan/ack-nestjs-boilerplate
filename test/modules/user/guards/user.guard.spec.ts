import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { RequestStoreService } from '@common/request/services/request.store.service';
import {
    UserGuardIsVerifiedMetaKey,
    UserStoreKey,
} from '@modules/user/constants/user.constant';
import { PolicyAbilityStoreKey } from '@modules/policy/constants/policy.constant';
import { EnumRolePlatformKey } from '@modules/role/enums/role.platform-key.enum';
import { UserGuard } from '@modules/user/guards/user.guard';
import { UserDomain } from '@modules/user/domains/user.domain';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IUser } from '@modules/user/interfaces/user.interface';
import {
    EnumRoleScope,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';

describe('UserGuard', () => {
    const reflector: MockProxy<Reflector> = mock<Reflector>();
    const userService: MockProxy<UserDomain> = mock<UserDomain>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    let guard: UserGuard;

    const request = { user: { userId: 'user-id' } };
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user: IUser = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            scope: EnumRoleScope.platform,
            key: EnumRolePlatformKey.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        twoFactor: null,
    };

    const createContext = (
        contextRequest: unknown = request
    ): MockProxy<ExecutionContext> => {
        const context: MockProxy<ExecutionContext> = mock<ExecutionContext>();
        context.switchToHttp.mockReturnValue({
            getRequest: () => contextRequest,
        } as ReturnType<ExecutionContext['switchToHttp']>);

        return context;
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        userService.validateUserGuard.mockResolvedValue(user);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserGuard,
                { provide: Reflector, useValue: reflector },
                { provide: UserDomain, useValue: userService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();
        guard = moduleRef.get(UserGuard);
    });

    it('validates the user, defaulting the verified requirement to false, and stores it', async () => {
        reflector.get.mockReturnValue(undefined);
        const context = createContext();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(reflector.get).toHaveBeenCalledWith(
            UserGuardIsVerifiedMetaKey,
            context.getHandler()
        );
        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            'user-id',
            false
        );
        expect(requestStoreService.set).toHaveBeenCalledWith(
            UserStoreKey,
            user
        );
    });

    it('stores only the user and never builds or stores an ability', async () => {
        reflector.get.mockReturnValue(undefined);

        await guard.canActivate(createContext());

        expect(requestStoreService.set).toHaveBeenCalledTimes(1);
        expect(requestStoreService.set).not.toHaveBeenCalledWith(
            PolicyAbilityStoreKey,
            expect.anything()
        );
    });

    it('forwards the required-verified metadata when present', async () => {
        reflector.get.mockReturnValue(true);
        const context = createContext();

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(userService.validateUserGuard).toHaveBeenCalledWith(
            'user-id',
            true
        );
    });

    it('passes a null user id when the request carries no user', async () => {
        reflector.get.mockReturnValue(undefined);
        const context = createContext({});

        await expect(guard.canActivate(context)).resolves.toBe(true);

        expect(userService.validateUserGuard).toHaveBeenCalledWith(null, false);
    });

    it('propagates the domain rejection unchanged and publishes nothing', async () => {
        const error = new Error('user rejected');
        reflector.get.mockReturnValue(undefined);
        userService.validateUserGuard.mockRejectedValue(error);

        await expect(guard.canActivate(createContext())).rejects.toBe(error);
        expect(requestStoreService.set).not.toHaveBeenCalled();
    });
});
