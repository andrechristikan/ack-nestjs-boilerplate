import { createMock } from '@golevelup/ts-vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    EnumRoleType,
    EnumUserGender,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    type User,
} from '@generated/prisma-client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { CountryService } from '@modules/country/services/country.service';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleService } from '@modules/role/services/role.service';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';
import { UserNotFoundForbiddenException } from '@modules/user/exceptions/user.not-found-forbidden.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserOnboardingRepository } from '@modules/user/repositories/user.onboarding.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginService } from '@modules/user/services/user.login.service';
import { UserOnboardingService } from '@modules/user/services/user.onboarding.service';
import { UserService } from '@modules/user/services/user.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { UserUtil } from '@modules/user/utils/user.util';

describe('UserService', () => {
    const userRepository = {
        findOneWithRoleById: vi.fn<UserRepository['findOneWithRoleById']>(),
    } satisfies Pick<UserRepository, 'findOneWithRoleById'>;
    const authPasswordService = {
        checkPasswordExpired:
            vi.fn<AuthPasswordService['checkPasswordExpired']>(),
    } satisfies Pick<AuthPasswordService, 'checkPasswordExpired'>;
    const userOnboardingRepository = createMock<UserOnboardingRepository>();
    const roleService = createMock<RoleService>();
    const countryService = createMock<CountryService>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationService>();
    const helperHashService = createMock<HelperHashService>();
    const userOnboardingUtil = createMock<UserOnboardingUtil>();
    const userOnboardingService = createMock<UserOnboardingService>();
    const userLoginService = createMock<UserLoginService>();
    const databaseUtil = createMock<DatabaseUtil>();
    const notificationQueue = createMock<NotificationQueue>();
    const helperDateService = createMock<HelperDateService>();
    const requestStoreService = createMock<RequestStoreService>();

    const now = new Date('2026-01-01T00:00:00.000Z');
    const userRow = {
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
        signUpFrom: EnumUserSignUpFrom.admin,
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
    } satisfies User;
    const activeUser = {
        ...userRow,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    } satisfies IUser;

    let service: UserService;

    beforeEach(async () => {
        vi.resetAllMocks();
        authPasswordService.checkPasswordExpired.mockReturnValue(false);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: userRepository },
                {
                    provide: UserOnboardingRepository,
                    useValue: userOnboardingRepository,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserOnboardingService,
                    useValue: userOnboardingService,
                },
                { provide: UserLoginService, useValue: userLoginService },
                { provide: AuthPasswordService, useValue: authPasswordService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
            ],
        }).compile();

        service = moduleRef.get(UserService);
    });

    it('rejects a missing authenticated user id', async () => {
        await expect(
            service.validateUserGuard(null, false)
        ).rejects.toBeInstanceOf(UserNotAuthenticatedException);
        expect(userRepository.findOneWithRoleById).not.toHaveBeenCalled();
    });

    it('rejects an unknown user', async () => {
        userRepository.findOneWithRoleById.mockResolvedValue(null);
        await expect(
            service.validateUserGuard('missing', false)
        ).rejects.toBeInstanceOf(UserNotFoundForbiddenException);
    });

    it.each([
        [EnumUserStatus.blocked, UserBlockedForbiddenException],
        [EnumUserStatus.inactive, UserInactiveForbiddenException],
    ])('rejects users with %s status', async (status, ExceptionClass) => {
        userRepository.findOneWithRoleById.mockResolvedValue({
            ...activeUser,
            status,
        });
        await expect(
            service.validateUserGuard('user-id', false)
        ).rejects.toBeInstanceOf(ExceptionClass);
    });

    it('rejects an expired password', async () => {
        userRepository.findOneWithRoleById.mockResolvedValue(activeUser);
        authPasswordService.checkPasswordExpired.mockReturnValue(true);
        await expect(
            service.validateUserGuard('user-id', false)
        ).rejects.toBeInstanceOf(UserPasswordExpiredException);
    });

    it('rejects an unverified user when verification is required', async () => {
        userRepository.findOneWithRoleById.mockResolvedValue({
            ...activeUser,
            isVerified: false,
        });
        await expect(
            service.validateUserGuard('user-id', true)
        ).rejects.toBeInstanceOf(UserEmailNotVerifiedException);
    });

    it('returns an active verified user', async () => {
        userRepository.findOneWithRoleById.mockResolvedValue(activeUser);
        await expect(service.validateUserGuard('user-id', true)).resolves.toBe(
            activeUser
        );
    });
});
