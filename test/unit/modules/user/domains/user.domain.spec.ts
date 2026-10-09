import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import type {
    IUser,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { expectRequestGuardMissingWithKey } from '@test/unit/helpers/test.unit.request.helper';

describe('UserDomain', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const helperHashService: MockProxy<HelperHashService> =
        mock<HelperHashService>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();

    let domain: UserDomain;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');

    const role: IRoleWithPolicies = {
        id: 'role-cobalt',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        policies: [],
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-cobalt',
        userId: 'user-cobalt',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };

    const baseUser: IUser = {
        id: 'user-cobalt',
        name: 'Cobalt Reyes',
        username: 'cobaltReyes',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'cobalt@example.com',
        roleId: role.id,
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-cobalt',
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
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role,
        twoFactor,
    };

    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userUpdateStatus,
        metadata: {},
        onError: false,
        userId: null,
        createdBy: null,
        workspaceId: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        activityLogDomain.prepare.mockReturnValue(activityLog);
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserDomain,
                { provide: UserRepository, useValue: userRepository },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
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
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: SessionDomain, useValue: sessionDomain },
            ],
        }).compile();
        domain = module.get(UserDomain);
    });

    describe('validateUserGuard', () => {
        it('throws RequestGuardMissingException when the request carries no authenticated user id', async () => {
            let thrown: unknown;
            try {
                await domain.validateUserGuard(null, false);
            } catch (error) {
                thrown = error;
            }

            expectRequestGuardMissingWithKey(thrown, 'request.user');
        });

        it('throws RequestContextMissingException when the authenticated user carries no user id', async () => {
            let thrown: unknown;
            try {
                await domain.validateUserGuard({ userId: '' }, false);
            } catch (error) {
                thrown = error;
            }

            expect(thrown).toBeInstanceOf(RequestContextMissingException);
            expect(thrown).toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
                messagePath: 'request.error.contextMissing',
                rawError: expect.objectContaining({
                    message:
                        'RequestContextMissingException: no value for "request.user.userId"',
                }),
            });
        });

        it('throws UserAccountNotFoundException when the user row is gone', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            const call = domain.validateUserGuard(
                { userId: 'user-cobalt' },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.accountNotFound,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.accountNotFound
                    ],
                httpStatus: HttpStatus.UNAUTHORIZED,
                messagePath: 'user.error.accountNotFound',
            });
        });

        it('throws UserBlockedForbiddenException when the user is blocked', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.blocked,
            });

            const call = domain.validateUserGuard(
                { userId: 'user-cobalt' },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedForbidden
                    ],
                messagePath: 'user.error.blocked',
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            const call = domain.validateUserGuard(
                { userId: 'user-cobalt' },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.inactiveForbidden
                    ],
                messagePath: 'user.error.inactive',
            });
        });

        it('throws UserPasswordExpiredException when the password is expired', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            const call = domain.validateUserGuard(
                { userId: 'user-cobalt' },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.passwordExpired
                    ],
                messagePath: 'user.error.passwordExpired',
            });
        });

        it('throws UserEmailNotVerifiedException when verification is required and missing', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            const call = domain.validateUserGuard(
                { userId: 'user-cobalt' },
                true
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.emailNotVerified
                    ],
                messagePath: 'user.error.emailNotVerified',
            });
        });

        it('returns the user when every check passes', async () => {
            const user = baseUser;
            userRepository.findOneWithRoleById.mockResolvedValue(user);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                domain.validateUserGuard({ userId: 'user-cobalt' }, true)
            ).resolves.toBe(user);
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository', async () => {
            const params: IPaginationQueryOffsetParams<Prisma.UserWhereInput> =
                {
                    skip: 0,
                    limit: 20,
                    orderBy: [],
                };
            const listRow: IUserList = {
                id: 'user-cobalt',
                name: 'Cobalt Reyes',
                username: 'cobaltReyes',
                isVerified: true,
                verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
                email: 'cobalt@example.com',
                roleId: role.id,
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordAttempt: 0,
                signUpAt: new Date('2026-01-01T00:00:00.000Z'),
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                status: EnumUserStatus.active,
                gender: null,
                countryId: 'country-cobalt',
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
                twoFactor,
            };
            const response: IResponsePaginationReturn<IUserList> = {
                type: EnumPaginationType.offset,
                count: 1,
                perPage: 20,
                page: 1,
                totalPage: 1,
                hasNext: false,
                hasPrevious: false,
                data: [listRow],
            };
            userRepository.findWithPaginationOffset.mockResolvedValue(response);

            const status = { status: { in: [EnumUserStatus.active] } };
            const roleId = { roleId: { equals: role.id } };
            const countryId = { countryId: { equals: 'country-cobalt' } };

            await expect(
                domain.getListOffsetByAdmin(params, status, roleId, countryId)
            ).resolves.toBe(response);
            expect(
                userRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(params, status, roleId, countryId);
        });

        it('passes null filters when none is given', async () => {
            const pagination: IPaginationQueryOffsetParams<Prisma.UserWhereInput> =
                { skip: 0, limit: 20, orderBy: [] };
            const page: IResponsePaginationReturn<IUserList> = {
                type: EnumPaginationType.offset,
                count: 0,
                perPage: 20,
                page: 1,
                totalPage: 0,
                hasNext: false,
                hasPrevious: false,
                data: [],
            };
            userRepository.findWithPaginationOffset.mockResolvedValue(page);

            const result = await domain.getListOffsetByAdmin(pagination);

            expect(result).toBe(page);
            expect(
                userRepository.findWithPaginationOffset
            ).toHaveBeenCalledWith(pagination, null, null, null);
        });
    });

    describe('getOneActive', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.findOneActiveById.mockResolvedValue(user);

            await expect(domain.getOneActive(user.id)).resolves.toBe(user);
        });
    });

    describe('getOneActiveByEmail', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.findOneActiveByEmail.mockResolvedValue(user);

            await expect(domain.getOneActiveByEmail(user.email)).resolves.toBe(
                user
            );
        });
    });

    describe('getNameById', () => {
        it('delegates to the repository', async () => {
            const ref = { name: 'Cobalt Reyes', username: 'cobaltReyes' };
            userRepository.findNameById.mockResolvedValue(ref);

            await expect(domain.getNameById('user-cobalt')).resolves.toBe(ref);
        });
    });

    describe('setLastWorkspace', () => {
        it('delegates to the repository', async () => {
            await domain.setLastWorkspace('user-cobalt', 'workspace-cobalt');

            expect(userRepository.setLastWorkspace).toHaveBeenCalledWith(
                'user-cobalt',
                'workspace-cobalt'
            );
        });
    });

    describe('setLastWorkspaceInTx', () => {
        it('delegates to the repository', async () => {
            await domain.setLastWorkspaceInTx(
                tx,
                'user-cobalt',
                'workspace-cobalt'
            );

            expect(userRepository.setLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                'workspace-cobalt'
            );
        });
    });

    describe('acceptTermPolicyInTx', () => {
        it('delegates to the repository', async () => {
            await domain.acceptTermPolicyInTx(
                tx,
                'user-cobalt',
                EnumTermPolicyType.marketing
            );

            expect(userRepository.acceptTermPolicyInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                EnumTermPolicyType.marketing
            );
        });
    });

    describe('resetTermPolicyInTx', () => {
        it('delegates to the repository', async () => {
            await domain.resetTermPolicyInTx(tx, EnumTermPolicyType.marketing);

            expect(userRepository.resetTermPolicyInTx).toHaveBeenCalledWith(
                tx,
                EnumTermPolicyType.marketing
            );
        });
    });

    describe('increasePasswordAttempt', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.increasePasswordAttempt.mockResolvedValue(user);

            await expect(domain.increasePasswordAttempt(user.id)).resolves.toBe(
                user
            );
        });
    });

    describe('resetPasswordAttempt', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.resetPasswordAttempt.mockResolvedValue(user);

            await expect(domain.resetPasswordAttempt(user.id)).resolves.toBe(
                user
            );
        });
    });

    describe('deactivateForMaxPasswordAttemptInTx', () => {
        it('delegates to the repository', async () => {
            await domain.deactivateForMaxPasswordAttemptInTx(tx, 'user-cobalt');

            expect(
                userRepository.deactivateForMaxPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-cobalt');
        });
    });

    describe('updatePasswordInTx', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            const password: IAuthPassword = {
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            };
            userRepository.updatePasswordInTx.mockResolvedValue(user);

            await expect(
                domain.updatePasswordInTx(tx, user.id, password, 'admin-cobalt')
            ).resolves.toBe(user);
            expect(userRepository.updatePasswordInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                password,
                'admin-cobalt'
            );
        });
    });

    describe('updateLoginInTx', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.updateLoginInTx.mockResolvedValue(user);

            await expect(
                domain.updateLoginInTx(
                    tx,
                    user.id,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    '127.0.0.1',
                    now
                )
            ).resolves.toBe(user);
        });
    });

    describe('touchUpdatedByInTx', () => {
        it('delegates to the repository', async () => {
            await domain.touchUpdatedByInTx(tx, 'user-cobalt');

            expect(userRepository.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt'
            );
        });
    });

    describe('getListIdCursor', () => {
        it('forwards the cursor and take to the repository', async () => {
            const ids = ['user-cobalt', 'user-indigo'];
            userRepository.findIdsCursor.mockResolvedValue(ids);

            await expect(domain.getListIdCursor('user-amber', 2)).resolves.toBe(
                ids
            );
            expect(userRepository.findIdsCursor).toHaveBeenCalledWith(
                'user-amber',
                2
            );
        });
    });

    describe('getOne', () => {
        const profile: IUserProfile = {
            ...baseUser,
            mobileNumbers: [],
            country: {
                id: 'country-cobalt',
                name: 'Cobalt Coast',
                alpha2Code: 'CB',
                alpha3Code: 'CBT',
                phoneCode: ['+1'],
                continent: 'Atlantis',
                timezone: 'UTC',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                createdBy: null,
                updatedAt: new Date('2026-01-01T00:00:00.000Z'),
                updatedBy: null,
            },
        };

        it('returns the profile', async () => {
            userRepository.findOneProfileById.mockResolvedValue(profile);

            await expect(domain.getOne(profile.id)).resolves.toBe(profile);
        });

        it('throws UserNotFoundException when the profile is missing', async () => {
            userRepository.findOneProfileById.mockResolvedValue(null);

            await expect(domain.getOne('missing')).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });
    });

    describe('prepareCreateByAdmin', () => {
        const role1: IRole = {
            id: 'role-cobalt',
            type: EnumRoleType.user,
            name: 'user',
        };
        const input = {
            countryId: 'country-cobalt',
            email: 'cobalt@example.com',
            name: 'Cobalt Reyes',
            roleId: role1.id,
            username: 'cobaltReyes',
        };

        beforeEach(() => {
            roleDomain.getById.mockResolvedValue(role1);
            userRepository.existsByEmail.mockResolvedValue(false);
            countryDomain.existsById.mockResolvedValue(true);
            userUtil.checkUsernamePattern.mockReturnValue(false);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(false);
            databaseUtil.createId.mockReturnValue('user-id-cobalt');
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockReturnValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userOnboardingDomain.buildPersonalWorkspaceContexts.mockReturnValue(
                [
                    {
                        type: EnumUserSignUpWorkspaceContextType.personal,
                        workspaceId: 'workspace-cobalt',
                        slugCandidates: ['w-cobalt'],
                        name: "cobaltReyes's Workspace",
                    },
                ]
            );
        });

        it('prepares the create input with no verification for a plain user role', async () => {
            const result = await domain.prepareCreateByAdmin(
                input,
                'admin-cobalt'
            );

            expect(result.input).toMatchObject({
                userId: 'user-id-cobalt',
                email: input.email,
                name: input.name,
                username: input.username,
                countryId: input.countryId,
                roleId: role1.id,
                signUpFrom: EnumUserSignUpFrom.admin,
                signUpWith: EnumUserSignUpWith.credential,
                isVerified: false,
                verification: null,
                createdBy: 'admin-cobalt',
            });
            expect(result.passwordString).toBe('random-password');
        });

        it('keeps a null name null', async () => {
            const result = await domain.prepareCreateByAdmin(
                { ...input, name: null },
                'admin-cobalt'
            );

            expect(result.input.name).toBeNull();
        });

        it('prepares the create input with a verified, used verification for an elevated role', async () => {
            roleDomain.getById.mockResolvedValue({
                ...role1,
                type: EnumRoleType.admin,
            });
            userVerificationDomain.verificationCreateToken.mockReturnValue(
                'raw-token'
            );
            userVerificationDomain.verificationCreateReference.mockReturnValue(
                'ref-cobalt'
            );
            userVerificationDomain.verificationSetExpiredDate.mockReturnValue(
                new Date('2026-02-01T00:00:00.000Z')
            );
            helperHashService.sha256Hash.mockReturnValue('hashed-token');

            const result = await domain.prepareCreateByAdmin(
                input,
                'admin-cobalt'
            );

            expect(result.input.isVerified).toBe(true);
            expect(result.input.verification).toEqual({
                reference: 'ref-cobalt',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                to: input.email,
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                verifiedAt: now,
                isUsed: true,
            });
        });

        it('throws RoleNotFoundException when the role is missing', async () => {
            roleDomain.getById.mockResolvedValue(null);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                statusCodeKey:
                    EnumRoleStatusCodeError[EnumRoleStatusCodeError.notFound],
                messagePath: 'role.error.notFound',
            });
        });

        it('throws CountryNotFoundException when the country is missing', async () => {
            countryDomain.existsById.mockResolvedValue(false);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                statusCodeKey:
                    EnumCountryStatusCodeError[
                        EnumCountryStatusCodeError.notFound
                    ],
                messagePath: 'country.error.notFound',
            });
        });

        it('throws UserEmailExistException when the email is taken', async () => {
            userRepository.existsByEmail.mockResolvedValue(true);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
        });

        it('throws UserUsernameNotAllowedException when the username breaks the pattern', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(true);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameNotAllowed
                    ],
                messagePath: 'user.error.usernameNotAllowed',
            });
        });

        it('throws UserUsernameContainBadWordException when the username is profane', async () => {
            userUtil.checkBadWord.mockResolvedValue(true);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameContainBadWord
                    ],
                messagePath: 'user.error.usernameContainBadWord',
            });
        });

        it('throws UserUsernameExistException when the username is taken', async () => {
            userRepository.existsByUsername.mockResolvedValue(true);

            const call = domain.prepareCreateByAdmin(input, 'admin-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
        });
    });

    describe('notifyWelcomeByAdmin', () => {
        it('formats the password dates and sends the welcome notification', async () => {
            const passwordCreated = new Date('2026-01-01T00:00:00.000Z');
            const passwordExpired = new Date('2026-06-01T00:00:00.000Z');
            helperDateService.formatToIso.mockImplementation(date =>
                date.toISOString()
            );

            await domain.notifyWelcomeByAdmin(
                'user-cobalt',
                'random-password',
                passwordCreated,
                passwordExpired,
                'admin-cobalt'
            );

            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                'user-cobalt',
                {
                    password: 'random-password',
                    passwordCreatedAt: passwordCreated.toISOString(),
                    passwordExpiredAt: passwordExpired.toISOString(),
                },
                'admin-cobalt'
            );
        });
    });

    describe('updateStatusByAdmin', () => {
        it('throws UserNotSelfException when the admin targets themselves', async () => {
            const call = domain.updateStatusByAdmin(
                'admin-cobalt',
                EnumUserStatus.blocked,
                'admin-cobalt'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notSelf,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notSelf],
                messagePath: 'user.error.notSelf',
            });
        });

        it('throws UserNotFoundException when the target user does not exist', async () => {
            userRepository.findOneById.mockResolvedValue(null);

            const call = domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.blocked,
                'admin-cobalt'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
        });

        it('throws UserBlockedInvalidException when the target user is already blocked', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.blocked,
            });

            const call = domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.inactive,
                'admin-cobalt'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.blockedInvalid
                    ],
                messagePath: 'user.error.blockedInvalid',
            });
        });

        it('blocks the user, revoking sessions and logging the block action', async () => {
            const user = { ...baseUser, status: EnumUserStatus.active };
            userRepository.findOneById.mockResolvedValue(user);
            userRepository.updateStatusByAdminInTx.mockResolvedValue(user);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue([
                { id: 'session-one' },
            ]);
            sessionDomain.prepareRevokeAllByAdmin.mockReturnValue([
                activityLog,
            ]);

            await domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.blocked,
                'admin-cobalt'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userBlocked,
                })
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                'admin-cobalt',
                now
            );
            expect(sessionDomain.prepareRevokeAllByAdmin).toHaveBeenCalledWith(
                'user-cobalt',
                'admin-cobalt',
                1
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                'user-cobalt',
                [activityLog]
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('deactivates the user, revoking sessions with the update-status action', async () => {
            const user = { ...baseUser, status: EnumUserStatus.active };
            userRepository.findOneById.mockResolvedValue(user);
            userRepository.updateStatusByAdminInTx.mockResolvedValue(user);
            sessionDomain.revokeActiveByUserInTx.mockResolvedValue([]);
            sessionDomain.prepareRevokeAllByAdmin.mockReturnValue([]);

            await domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.inactive,
                'admin-cobalt'
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: EnumActivityLogAction.userUpdateStatus,
                })
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalled();
        });

        it('reactivates the user without touching sessions', async () => {
            const user = { ...baseUser, status: EnumUserStatus.inactive };
            userRepository.findOneById.mockResolvedValue(user);
            userRepository.updateStatusByAdminInTx.mockResolvedValue(user);

            await domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.active,
                'admin-cobalt'
            );

            expect(sessionDomain.revokeActiveByUserInTx).not.toHaveBeenCalled();
            expect(sessionDomain.finalizeRevokeAll).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.active,
            });
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.blocked,
                'admin-cobalt'
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            userRepository.findOneById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.active,
            });
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.updateStatusByAdmin(
                'user-cobalt',
                EnumUserStatus.blocked,
                'admin-cobalt'
            );

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('checkUsername', () => {
        it('combines the pattern, bad-word and existence checks', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(true);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(true);

            await expect(domain.checkUsername('cobaltReyes')).resolves.toEqual({
                badWord: false,
                exist: true,
                pattern: true,
            });
        });
    });

    describe('checkEmail', () => {
        it('combines the bad-word and existence checks', async () => {
            userUtil.checkBadWord.mockResolvedValue(true);
            userRepository.existsByEmail.mockResolvedValue(false);

            await expect(
                domain.checkEmail('cobalt@example.com')
            ).resolves.toEqual({
                badWord: true,
                exist: false,
            });
        });
    });

    describe('deleteSelf', () => {
        it('deletes the account, revokes sessions and devices, and stages the activity log', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([activityLog]);

            await domain.deleteSelf('user-cobalt');

            expect(sessionDomain.prepareRevokeAllSelf).toHaveBeenCalledWith(
                'user-cobalt',
                false
            );
            expect(userRepository.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                now
            );
            expect(sessionDomain.revokeActiveByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                'user-cobalt',
                now
            );
            expect(deviceDomain.revokeAllByUserInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                'user-cobalt',
                now
            );
            expect(sessionDomain.finalizeRevokeAll).toHaveBeenCalledWith(
                'user-cobalt',
                [activityLog]
            );
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('rethrows an AppBaseException raised inside the transaction', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([activityLog]);
            const error = new UserNotFoundException();
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteSelf('user-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.notFound],
                messagePath: 'user.error.notFound',
            });
            await expect(call).rejects.toBe(error);
        });

        it('wraps an unknown error raised inside the transaction', async () => {
            sessionDomain.prepareRevokeAllSelf.mockReturnValue([activityLog]);
            const error = new Error('boom');
            databaseService.withTransaction.mockRejectedValueOnce(error);

            const call = domain.deleteSelf('user-cobalt');

            await expect(call).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                statusCodeKey:
                    EnumAppStatusCodeError[EnumAppStatusCodeError.unknown],
                messagePath: 'http.serverError.internalServerError',
                rawError: error,
            });
        });
    });

    describe('buildVerifiedVerification', () => {
        it('builds a used, verified verification for the given email', () => {
            userVerificationDomain.verificationCreateToken.mockReturnValue(
                'raw-token'
            );
            userVerificationDomain.verificationCreateReference.mockReturnValue(
                'ref-cobalt'
            );
            helperHashService.sha256Hash.mockReturnValue('hashed-token');
            userVerificationDomain.verificationSetExpiredDate.mockReturnValue(
                new Date('2026-02-01T00:00:00.000Z')
            );

            const result =
                domain['buildVerifiedVerification']('cobalt@example.com');

            expect(result).toEqual({
                reference: 'ref-cobalt',
                token: 'hashed-token',
                type: EnumVerificationType.email,
                to: 'cobalt@example.com',
                expiredAt: new Date('2026-02-01T00:00:00.000Z'),
                verifiedAt: now,
                isUsed: true,
            });
        });
    });
});
