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
import { DatabaseService } from '@common/database/services/database.service';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';
import { UserNotFoundForbiddenException } from '@modules/user/exceptions/user.not-found-forbidden.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { createDatabaseServiceMock } from '@test/support/database.mock';

describe('UserDomain', () => {
    const userRepository = {
        findOneWithRoleById: vi.fn<UserRepository['findOneWithRoleById']>(),
    } satisfies Pick<UserRepository, 'findOneWithRoleById'>;
    const authPasswordService = {
        checkPasswordExpired: vi.fn<AuthPasswordUtil['checkPasswordExpired']>(),
    } satisfies Pick<AuthPasswordUtil, 'checkPasswordExpired'>;
    const roleService = createMock<RoleDomain>();
    const countryService = createMock<CountryDomain>();
    const userUtil = createMock<UserUtil>();
    const userVerificationService = createMock<UserVerificationDomain>();
    const helperHashService = createMock<HelperHashService>();
    const userOnboardingService = createMock<UserOnboardingDomain>();
    const userLoginService = createMock<UserLoginDomain>();
    const databaseUtil = createMock<DatabaseUtil>();
    const notificationQueue = createMock<NotificationQueue>();
    const helperDateService = createMock<HelperDateService>();
    const requestStoreService = createMock<RequestStoreService>();
    const activityLogDomain = createMock<ActivityLogDomain>();
    const databaseService = createDatabaseServiceMock();

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

    let service: UserDomain;

    beforeEach(async () => {
        vi.resetAllMocks();
        authPasswordService.checkPasswordExpired.mockReturnValue(false);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: RoleDomain, useValue: roleService },
                { provide: CountryDomain, useValue: countryService },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationService,
                },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingService,
                },
                { provide: UserLoginDomain, useValue: userLoginService },
                { provide: AuthPasswordUtil, useValue: authPasswordService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: RequestStoreService, useValue: requestStoreService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
            ],
        }).compile();
        service = moduleRef.get(UserDomain);
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
