import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { DeepMockProxy, MockProxy } from 'vitest-mock-extended';

import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import {
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
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
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { UserBlockedForbiddenException } from '@modules/user/exceptions/user.blocked-forbidden.exception';
import { UserEmailNotVerifiedException } from '@modules/user/exceptions/user.email-not-verified.exception';
import { UserInactiveForbiddenException } from '@modules/user/exceptions/user.inactive-forbidden.exception';
import { UserNotAuthenticatedException } from '@modules/user/exceptions/user.not-authenticated.exception';
import { UserNotFoundForbiddenException } from '@modules/user/exceptions/user.not-found-forbidden.exception';
import { UserPasswordExpiredException } from '@modules/user/exceptions/user.password-expired.exception';
import { UserBlockedInvalidException } from '@modules/user/exceptions/user.blocked-invalid.exception';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserNotSelfException } from '@modules/user/exceptions/user.not-self.exception';
import { UserUsernameContainBadWordException } from '@modules/user/exceptions/user.username-contain-bad-word.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserUsernameNotAllowedException } from '@modules/user/exceptions/user.username-not-allowed.exception';
import type {
    IUser,
    IUserContact,
    IUserProfile,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserLoginDomain } from '@modules/user/domains/user.login.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { UserUtil } from '@modules/user/utils/user.util';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStagedEvent } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IWorkspaceInviteInviter } from '@modules/workspace/interfaces/workspace.interface';

vi.mock('@common/sentry/services/sentry.service', () => ({
    SentryService: class {},
}));

describe('UserDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const userLoginDomain: MockProxy<UserLoginDomain> = mock<UserLoginDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const requestStoreService: MockProxy<RequestStoreService> =
        mock<RequestStoreService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: DeepMockProxy<DatabaseService> =
        mockDeep<DatabaseService>();
    const transactionClient: MockProxy<IDatabaseTransactionClient> =
        mock<IDatabaseTransactionClient>();

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
    const adminRole = {
        ...activeUser.role,
        id: 'admin-role-id',
        name: 'Admin',
        type: EnumRoleType.admin,
    };
    const workspaceContext = mock<IUserSignUpWorkspacePersonal>();
    const password = {
        passwordHash: 'password-hash',
        passwordCreated: now,
        passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };

    let service: UserDomain;

    beforeEach(async () => {
        authPasswordUtil.checkPasswordExpired.mockReturnValue(false);
        databaseService.withTransaction.mockImplementation(async callback =>
            callback(transactionClient)
        );
        helperDateService.create.mockReturnValue(now);
        userRepository.findOneById.mockResolvedValue(userRow);
        roleDomain.getById.mockResolvedValue(activeUser.role);
        countryDomain.existsById.mockResolvedValue(true);
        userRepository.existsByEmail.mockResolvedValue(false);
        userRepository.existsByUsername.mockResolvedValue(false);
        userUtil.checkUsernamePattern.mockReturnValue(false);
        userUtil.checkBadWord.mockResolvedValue(false);
        databaseUtil.createId.mockReturnValue('new-user-id');
        authPasswordUtil.createPasswordRandom.mockReturnValue(
            'temporary-password'
        );
        authPasswordUtil.createPassword.mockReturnValue(password);
        userOnboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue([
            workspaceContext,
        ]);
        userVerificationDomain.verificationCreateToken.mockReturnValue(
            'plain-token'
        );
        userVerificationDomain.verificationCreateReference.mockReturnValue(
            'VE-RANDOM'
        );
        userVerificationDomain.verificationSetExpiredDate.mockReturnValue(
            password.passwordExpired
        );
        helperHashService.sha256Hash.mockReturnValue('hashed-token');
        userRepository.updateStatusByAdminInTx.mockResolvedValue(userRow);
        userRepository.updatePasswordInTx.mockResolvedValue(userRow);
        userRepository.updateLoginInTx.mockResolvedValue(userRow);

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                UserDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                { provide: HelperHashService, useValue: helperHashService },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: UserLoginDomain, useValue: userLoginDomain },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: SessionDomain, useValue: sessionDomain },
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
        authPasswordUtil.checkPasswordExpired.mockReturnValue(true);
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

    it('returns an active user without requiring verification', async () => {
        const unverified = { ...activeUser, isVerified: false };
        userRepository.findOneWithRoleById.mockResolvedValue(unverified);

        await expect(
            service.validateUserGuard(userRow.id, false)
        ).resolves.toBe(unverified);
    });

    it('forwards read and simple write operations to the repository', async () => {
        const page = mock<IResponsePaginationReturn<never>>();
        const pagination = { limit: 20, page: 1, skip: 0 };
        const status = { status: { in: [EnumUserStatus.active] } };
        const roleId = { roleId: { equals: 'role-id' } };
        const countryId = { countryId: { equals: 'country-id' } };
        const profile = mock<IUserProfile>();
        const contact = mock<IUserContact>();
        const inviter = mock<IWorkspaceInviteInviter>();
        userRepository.findWithPaginationOffset.mockResolvedValue(page);
        userRepository.findOneActiveById.mockResolvedValue(userRow);
        userRepository.findOneActiveByEmail.mockResolvedValue(userRow);
        userRepository.findNameById.mockResolvedValue(inviter);
        userRepository.findActive.mockResolvedValue([contact]);
        userRepository.findOneProfileById.mockResolvedValue(profile);
        userRepository.increasePasswordAttempt.mockResolvedValue(userRow);
        userRepository.resetPasswordAttempt.mockResolvedValue(userRow);

        await expect(
            service.getListOffsetByAdmin(pagination, status, roleId, countryId)
        ).resolves.toBe(page);
        await expect(service.getOneActive(userRow.id)).resolves.toBe(userRow);
        await expect(service.getOneActiveByEmail(userRow.email)).resolves.toBe(
            userRow
        );
        await expect(service.getNameById(userRow.id)).resolves.toBe(inviter);
        await expect(service.getListActive()).resolves.toEqual([contact]);
        await expect(service.getOne(userRow.id)).resolves.toBe(profile);
        await expect(service.increasePasswordAttempt(userRow.id)).resolves.toBe(
            userRow
        );
        await expect(service.resetPasswordAttempt(userRow.id)).resolves.toBe(
            userRow
        );
        await service.setLastWorkspace(userRow.id, 'workspace-id');
        await service.setLastWorkspaceInTx(
            transactionClient,
            userRow.id,
            'workspace-id'
        );
        await service.acceptTermPolicyInTx(
            transactionClient,
            userRow.id,
            EnumTermPolicyType.cookies
        );
        await service.resetTermPolicyForActiveUsersInTx(
            transactionClient,
            EnumTermPolicyType.cookies
        );
        await service.deactivateForMaxPasswordAttemptInTx(
            transactionClient,
            userRow.id
        );
        await expect(
            service.updatePasswordInTx(
                transactionClient,
                userRow.id,
                password,
                userRow.id
            )
        ).resolves.toBe(userRow);
        await expect(
            service.updateLoginInTx(
                transactionClient,
                userRow.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                '127.0.0.1',
                now
            )
        ).resolves.toBe(userRow);
        await service.touchUpdatedByInTx(transactionClient, userRow.id);
    });

    it('rejects an unknown user profile', async () => {
        userRepository.findOneProfileById.mockResolvedValue(null);

        await expect(service.getOne('missing')).rejects.toBeInstanceOf(
            UserNotFoundException
        );
    });

    describe('prepareCreateByAdmin', () => {
        const input = {
            username: 'new-user',
            email: 'new@example.com',
            name: 'New User',
            roleId: 'role-id',
            countryId: 'country-id',
        };

        it('prepares an unverified regular user with a personal workspace', async () => {
            const result = await service.prepareCreateByAdmin(
                input,
                'admin-id'
            );

            expect(result).toMatchObject({
                passwordString: 'temporary-password',
                input: {
                    userId: 'new-user-id',
                    name: 'New User',
                    roleId: activeUser.role.id,
                    isVerified: false,
                    verification: null,
                    workspaceContext,
                    createdBy: 'admin-id',
                },
            });
        });

        it('prepares a verified administrator and hashes its used verification', async () => {
            roleDomain.getById.mockResolvedValue(adminRole);

            const result = await service.prepareCreateByAdmin(
                { ...input, name: undefined, roleId: adminRole.id },
                'creator-id'
            );

            expect(result.input).toMatchObject({
                name: null,
                roleId: adminRole.id,
                isVerified: true,
                verification: {
                    reference: 'VE-RANDOM',
                    token: 'hashed-token',
                    to: input.email,
                    verifiedAt: now,
                    isUsed: true,
                },
            });
        });

        it.each([
            ['missing role', null, true, false, RoleNotFoundException],
            [
                'missing country',
                activeUser.role,
                false,
                false,
                CountryNotFoundException,
            ],
            [
                'duplicate email',
                activeUser.role,
                true,
                true,
                UserEmailExistException,
            ],
        ])(
            'rejects creation for a %s',
            async (_case, role, countryExists, emailExists, ExceptionClass) => {
                roleDomain.getById.mockResolvedValue(role);
                countryDomain.existsById.mockResolvedValue(countryExists);
                userRepository.existsByEmail.mockResolvedValue(emailExists);

                await expect(
                    service.prepareCreateByAdmin(input, 'admin-id')
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );

        it.each([
            [
                'invalid pattern',
                true,
                false,
                false,
                UserUsernameNotAllowedException,
            ],
            [
                'bad word',
                false,
                true,
                false,
                UserUsernameContainBadWordException,
            ],
            ['duplicate', false, false, true, UserUsernameExistException],
        ])(
            'rejects creation for a username with %s',
            async (_case, invalid, badWord, exists, ExceptionClass) => {
                userUtil.checkUsernamePattern.mockReturnValue(invalid);
                userUtil.checkBadWord.mockResolvedValue(badWord);
                userRepository.existsByUsername.mockResolvedValue(exists);

                await expect(
                    service.prepareCreateByAdmin(input, 'admin-id')
                ).rejects.toBeInstanceOf(ExceptionClass);
            }
        );
    });

    it('formats and queues an administrator welcome notification', async () => {
        helperDateService.formatToIso
            .mockReturnValueOnce('2026-01-01T00:00:00.000Z')
            .mockReturnValueOnce('2026-02-01T00:00:00.000Z');

        await service.notifyWelcomeByAdmin(
            userRow.id,
            'temporary-password',
            now,
            password.passwordExpired,
            'admin-id'
        );

        expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
            userRow.id,
            {
                password: 'temporary-password',
                passwordCreatedAt: '2026-01-01T00:00:00.000Z',
                passwordExpiredAt: '2026-02-01T00:00:00.000Z',
            },
            'admin-id'
        );
    });

    describe('updateStatusByAdmin', () => {
        it('updates active status without revoking sessions', async () => {
            await service.updateStatusByAdmin(
                userRow.id,
                EnumUserStatus.active,
                'admin-id'
            );

            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
            expect(sessionDomain.finalizeRevokeAll).not.toHaveBeenCalled();
        });

        it.each([EnumUserStatus.blocked, EnumUserStatus.inactive])(
            'updates %s status and revokes every active session',
            async status => {
                const sessions = [{ id: 'session-id' }];
                const revokeEvents = [mock<IActivityLogStagedEvent>()];
                sessionDomain.revokeActiveByUserInTx.mockResolvedValue(
                    sessions
                );
                sessionDomain.prepareRevokeAllByAdmin.mockReturnValue(
                    revokeEvents
                );

                await service.updateStatusByAdmin(
                    userRow.id,
                    status,
                    'admin-id'
                );

                expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                    userRow.id,
                    revokeEvents
                );
            }
        );

        it('rejects an administrator updating their own status', async () => {
            await expect(
                service.updateStatusByAdmin(
                    userRow.id,
                    EnumUserStatus.inactive,
                    userRow.id
                )
            ).rejects.toBeInstanceOf(UserNotSelfException);
        });

        it('rejects an unknown target user', async () => {
            userRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.updateStatusByAdmin(
                    userRow.id,
                    EnumUserStatus.inactive,
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('rejects a target user that is already blocked', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...userRow,
                status: EnumUserStatus.blocked,
            });

            await expect(
                service.updateStatusByAdmin(
                    userRow.id,
                    EnumUserStatus.active,
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserBlockedInvalidException);
        });

        it('preserves a domain failure from the status transaction', async () => {
            userRepository.updateStatusByAdminInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(
                service.updateStatusByAdmin(
                    userRow.id,
                    EnumUserStatus.active,
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(UserNotFoundException);
        });

        it('wraps an unexpected status transaction failure', async () => {
            userRepository.updateStatusByAdminInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(
                service.updateStatusByAdmin(
                    userRow.id,
                    EnumUserStatus.active,
                    'admin-id'
                )
            ).rejects.toBeInstanceOf(AppUnknownException);
        });
    });

    it('returns username and email availability checks', async () => {
        userUtil.checkUsernamePattern.mockReturnValue(true);
        userUtil.checkBadWord
            .mockResolvedValueOnce(true)
            .mockResolvedValueOnce(false);
        userRepository.existsByUsername.mockResolvedValue(true);
        userRepository.existsByEmail.mockResolvedValue(false);

        await expect(service.checkUsername('bad username')).resolves.toEqual({
            badWord: true,
            exist: true,
            pattern: true,
        });
        await expect(service.checkEmail('user@example.com')).resolves.toEqual({
            badWord: false,
            exist: false,
        });
    });

    describe('deleteSelf', () => {
        it('deletes the user, revokes access, and finalizes audit events', async () => {
            const revokeEvents = [mock<IActivityLogStagedEvent>()];
            sessionDomain.prepareRevokeAllSelf.mockReturnValue(revokeEvents);

            await service.deleteSelf(userRow.id);

            expect(userRepository.deleteSelfInTx).toHaveBeenCalledWith(
                transactionClient,
                userRow.id,
                now
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                transactionClient,
                userRow.id,
                userRow.id,
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                transactionClient,
                userRow.id,
                userRow.id,
                now
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                userRow.id,
                revokeEvents
            );
        });

        it('preserves a domain failure while deleting the user', async () => {
            userRepository.deleteSelfInTx.mockRejectedValue(
                new UserNotFoundException()
            );

            await expect(service.deleteSelf(userRow.id)).rejects.toBeInstanceOf(
                UserNotFoundException
            );
        });

        it('wraps an unexpected self-delete failure', async () => {
            userRepository.deleteSelfInTx.mockRejectedValue(
                new Error('database down')
            );

            await expect(service.deleteSelf(userRow.id)).rejects.toBeInstanceOf(
                AppUnknownException
            );
        });
    });
});
