import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    Prisma,
} from '@generated/prisma-client/client';
import type { TwoFactor } from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserDeletedIdentity,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';

describe('UserService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const userTwoFactorService: MockProxy<UserTwoFactorService> =
        mock<UserTwoFactorService>();
    const authPasswordUtil: MockProxy<AuthPasswordUtil> =
        mock<AuthPasswordUtil>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');

    const role: IRoleWithPolicies = {
        id: 'role-cobalt',
        name: 'user',
        description: null,
        type: EnumRoleType.user,
        isImmutable: false,
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
        lastUsedStep: null,
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

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: userRepository },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                {
                    provide: UserTwoFactorService,
                    useValue: userTwoFactorService,
                },
                { provide: AuthPasswordUtil, useValue: authPasswordUtil },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();
        service = module.get(UserService);
    });

    describe('validateUserGuard', () => {
        it('throws RequestContextMissingException when the authenticated user carries no user id', async () => {
            let thrown: unknown;
            try {
                await service.validateUserGuard(
                    { userId: '', loginWith: EnumUserLoginWith.credential },
                    false
                );
            } catch (error) {
                thrown = error;
            }

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

            const call = service.validateUserGuard(
                {
                    userId: 'user-cobalt',
                    loginWith: EnumUserLoginWith.credential,
                },
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

            const call = service.validateUserGuard(
                {
                    userId: 'user-cobalt',
                    loginWith: EnumUserLoginWith.credential,
                },
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

            const call = service.validateUserGuard(
                {
                    userId: 'user-cobalt',
                    loginWith: EnumUserLoginWith.credential,
                },
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

        it('skips the password expiry check for a social session', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userUtil.gatesPasswordExpiryOn.mockReturnValue(false);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            await expect(
                service.validateUserGuard(
                    {
                        userId: 'user-cobalt',
                        loginWith: EnumUserLoginWith.socialGoogle,
                    },
                    false
                )
            ).resolves.toBe(baseUser);
            expect(userUtil.gatesPasswordExpiryOn).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle
            );
            expect(
                authPasswordUtil.checkPasswordExpired
            ).not.toHaveBeenCalled();
        });

        it('throws UserPasswordExpiredException for an expired credential session', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userUtil.gatesPasswordExpiryOn.mockReturnValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(true);

            const call = service.validateUserGuard(
                {
                    userId: 'user-cobalt',
                    loginWith: EnumUserLoginWith.credential,
                },
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
            userUtil.gatesPasswordExpiryOn.mockReturnValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            const call = service.validateUserGuard(
                {
                    userId: 'user-cobalt',
                    loginWith: EnumUserLoginWith.credential,
                },
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
            userUtil.gatesPasswordExpiryOn.mockReturnValue(true);
            authPasswordUtil.checkPasswordExpired.mockReturnValue(false);

            await expect(
                service.validateUserGuard(
                    {
                        userId: 'user-cobalt',
                        loginWith: EnumUserLoginWith.credential,
                    },
                    true
                )
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
                service.getListOffsetByAdmin(params, status, roleId, countryId)
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

            const result = await service.getListOffsetByAdmin(pagination);

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

            await expect(service.getOneActive(user.id)).resolves.toBe(user);
        });
    });

    describe('getManyActiveByIds', () => {
        it('delegates to the repository', async () => {
            const rows = [
                { id: 'user-a', email: 'a@example.com', username: 'a' },
                { id: 'user-b', email: 'b@example.com', username: 'b' },
            ];
            userRepository.findManyActiveByIds.mockResolvedValue(rows);

            await expect(
                service.getManyActiveByIds(['user-a', 'user-b'])
            ).resolves.toBe(rows);
            expect(userRepository.findManyActiveByIds).toHaveBeenCalledWith([
                'user-a',
                'user-b',
            ]);
        });
    });

    describe('getManyActiveRecipientsByIds', () => {
        it('delegates to the repository with the creation bound', async () => {
            const rows = [
                { id: 'user-a', email: 'a@example.com', username: 'a' },
            ];
            const createdBefore = new Date('2026-01-01T00:00:00.000Z');
            userRepository.findActiveRecipientsByIds.mockResolvedValue(rows);

            await expect(
                service.getManyActiveRecipientsByIds(['user-a'], createdBefore)
            ).resolves.toBe(rows);
            expect(
                userRepository.findActiveRecipientsByIds
            ).toHaveBeenCalledWith(['user-a'], createdBefore);
        });
    });

    describe('getOneActiveByEmail', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.findOneActiveByEmail.mockResolvedValue(user);

            await expect(service.getOneActiveByEmail(user.email)).resolves.toBe(
                user
            );
        });
    });

    describe('getNameById', () => {
        it('delegates to the repository', async () => {
            const ref = { name: 'Cobalt Reyes', username: 'cobaltReyes' };
            userRepository.findNameById.mockResolvedValue(ref);

            await expect(service.getNameById('user-cobalt')).resolves.toBe(ref);
        });
    });

    describe('setLastWorkspace', () => {
        it('delegates to the repository', async () => {
            await service.setLastWorkspace('user-cobalt', 'workspace-cobalt');

            expect(userRepository.setLastWorkspace).toHaveBeenCalledWith(
                'user-cobalt',
                'workspace-cobalt'
            );
        });
    });

    describe('createManyInTx', () => {
        const verification: IUserCreateVerification = {
            reference: 'ref-cobalt',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            to: 'cobalt@example.com',
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        };
        const withVerification: IUserCreateWithWorkspaceInput = {
            userId: 'user-cobalt',
            email: 'cobalt@example.com',
            name: 'Cobalt Reyes',
            username: 'cobaltReyes',
            countryId: 'country-cobalt',
            roleId: role.id,
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.credential,
            isVerified: false,
            verifiedAt: null,
            acceptedTermPolicyTypes: [],
            password: null,
            passwordHistoryType: null,
            verification,
            workspaceContext: {
                type: EnumUserSignUpWorkspaceContextType.personal,
                workspaceId: 'workspace-cobalt',
                slugCandidates: ['w-cobalt'],
                name: "cobaltReyes's Workspace",
            },
            createdBy: 'user-cobalt',
        };
        const withoutVerification: IUserCreateWithWorkspaceInput = {
            ...withVerification,
            userId: 'user-marigold',
            verification: null,
            createdBy: 'admin-cobalt',
        };
        const marigoldTwoFactor: TwoFactor = {
            ...twoFactor,
            id: 'two-factor-marigold',
            userId: 'user-marigold',
        };

        it('writes the users, then the verification row when the input carries one and the disabled two-factor row per user', async () => {
            const marigold: IUser = {
                ...baseUser,
                id: 'user-marigold',
                twoFactor: null,
            };
            userRepository.createManyInTx.mockResolvedValue([
                { ...baseUser, twoFactor: null },
                marigold,
            ]);
            userTwoFactorService.createDisabledInTx
                .mockResolvedValueOnce(twoFactor)
                .mockResolvedValueOnce(marigoldTwoFactor);

            const result = await service.createManyInTx(tx, [
                withVerification,
                withoutVerification,
            ]);

            expect(userRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                withVerification,
                withoutVerification,
            ]);
            expect(userVerificationService.createInTx).toHaveBeenCalledTimes(1);
            expect(userVerificationService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                verification,
                'user-cobalt'
            );
            expect(
                userTwoFactorService.createDisabledInTx
            ).toHaveBeenCalledWith(tx, 'user-cobalt', 'user-cobalt');
            expect(
                userTwoFactorService.createDisabledInTx
            ).toHaveBeenCalledWith(tx, 'user-marigold', 'admin-cobalt');
            expect(result).toEqual([
                { ...baseUser, twoFactor },
                { ...marigold, twoFactor: marigoldTwoFactor },
            ]);
        });

        it('issues no statement for an empty list', async () => {
            userRepository.createManyInTx.mockResolvedValue([]);

            await expect(service.createManyInTx(tx, [])).resolves.toEqual([]);
            expect(userVerificationService.createInTx).not.toHaveBeenCalled();
            expect(
                userTwoFactorService.createDisabledInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('setLastWorkspaceInTx', () => {
        it('delegates to the repository', async () => {
            await service.setLastWorkspaceInTx(
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

    describe('clearLastWorkspaceInTx', () => {
        it('delegates to the repository', async () => {
            await service.clearLastWorkspaceInTx(
                tx,
                'user-cobalt',
                'workspace-cobalt'
            );

            expect(userRepository.clearLastWorkspaceInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                'workspace-cobalt'
            );
        });
    });

    describe('getEmailByIdInTx', () => {
        it('returns the email the repository reads on the given transaction', async () => {
            userRepository.findEmailByIdInTx.mockResolvedValue(
                'cobalt@example.com'
            );

            await expect(
                service.getEmailByIdInTx(tx, 'user-cobalt')
            ).resolves.toBe('cobalt@example.com');
            expect(userRepository.findEmailByIdInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt'
            );
        });

        it('returns null when the user has no row', async () => {
            userRepository.findEmailByIdInTx.mockResolvedValue(null);

            await expect(
                service.getEmailByIdInTx(tx, 'user-cobalt')
            ).resolves.toBeNull();
        });
    });

    describe('resetPasswordAttempt', () => {
        it('delegates to the repository', async () => {
            const user = baseUser;
            userRepository.resetPasswordAttempt.mockResolvedValue(user);

            await expect(service.resetPasswordAttempt(user.id)).resolves.toBe(
                user
            );
        });
    });

    describe('deactivateForMaxAttemptInTx', () => {
        it('answers true when the repository deactivated the still-active account', async () => {
            userRepository.deactivateForMaxAttemptInTx.mockResolvedValue(true);

            await expect(
                service.deactivateForMaxAttemptInTx(tx, 'user-cobalt')
            ).resolves.toBe(true);
            expect(
                userRepository.deactivateForMaxAttemptInTx
            ).toHaveBeenCalledWith(tx, 'user-cobalt');
        });

        it('answers false when the account was no longer active', async () => {
            userRepository.deactivateForMaxAttemptInTx.mockResolvedValue(false);

            await expect(
                service.deactivateForMaxAttemptInTx(tx, 'user-cobalt')
            ).resolves.toBe(false);
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
                service.updatePasswordInTx(
                    tx,
                    user.id,
                    password,
                    'admin-cobalt'
                )
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
                service.updateLoginInTx(
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
            await service.touchUpdatedByInTx(tx, 'user-cobalt');

            expect(userRepository.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt'
            );
        });
    });

    describe('getListActiveRecipientCursor', () => {
        it('forwards the cursor, limit, and creation bound to the repository', async () => {
            const rows = [
                {
                    id: 'user-cobalt',
                    email: 'cobalt@example.com',
                    username: 'cobalt',
                },
                {
                    id: 'user-indigo',
                    email: 'indigo@example.com',
                    username: 'indigo',
                },
            ];
            const createdBefore = new Date('2026-01-01T00:00:00.000Z');
            const page = {
                type: EnumPaginationType.cursor,
                perPage: 2,
                hasNext: true,
                cursor: 'cursor-after-user-indigo',
                data: rows,
            } as const;
            userRepository.findActiveRecipientsCursor.mockResolvedValue(page);

            await expect(
                service.getListActiveRecipientCursor(
                    'user-amber',
                    2,
                    createdBefore
                )
            ).resolves.toBe(page);
            expect(
                userRepository.findActiveRecipientsCursor
            ).toHaveBeenCalledWith('user-amber', 2, createdBefore);
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

            await expect(service.getOne(profile.id)).resolves.toBe(profile);
        });

        it('throws UserNotFoundException when the profile is missing', async () => {
            userRepository.findOneProfileById.mockResolvedValue(null);

            await expect(service.getOne('missing')).rejects.toMatchObject({
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
            isImmutable: false,
            name: 'user',
        };
        const input = {
            countryId: 'country-cobalt',
            email: 'cobalt@example.com',
            name: 'Cobalt Reyes',
            roleId: role1.id,
            username: 'cobaltReyes',
        };
        const verified: IUserCreateVerification = {
            reference: 'ref-cobalt',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            to: input.email,
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            verifiedAt: now,
            isUsed: true,
        };

        beforeEach(() => {
            databaseUtil.createId.mockReturnValue('user-id-cobalt');
            authPasswordUtil.createPasswordRandom.mockReturnValue(
                'random-password'
            );
            authPasswordUtil.createPassword.mockResolvedValue({
                passwordHash: 'hashed',
                passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
            });
            userCreateUtil.buildPersonalWorkspaceContexts.mockReturnValue([
                {
                    type: EnumUserSignUpWorkspaceContextType.personal,
                    workspaceId: 'workspace-cobalt',
                    slugCandidates: ['w-cobalt'],
                    name: "cobaltReyes's Workspace",
                },
            ]);
            userVerificationUtil.createVerified.mockReturnValue(verified);
        });

        it('creates a user-role account verified at the verification time with a used verification row', async () => {
            const result = await service.prepareCreateByAdmin(
                input,
                'admin-cobalt',
                role1
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
                isVerified: true,
                verifiedAt: now,
                createdBy: 'admin-cobalt',
            });
            expect(userVerificationUtil.createVerified).toHaveBeenCalledWith(
                input.email
            );
            expect(result.input.verification).toBe(verified);
            expect(result.passwordString).toBe('random-password');
        });

        it('keeps a null name null', async () => {
            const result = await service.prepareCreateByAdmin(
                { ...input, name: null },
                'admin-cobalt',
                role1
            );

            expect(result.input.name).toBeNull();
        });
    });

    describe('existsByEmail', () => {
        it('delegates the existence read to the repository', async () => {
            userRepository.existsByEmail.mockResolvedValue(true);

            await expect(
                service.existsByEmail('cobalt@example.com')
            ).resolves.toBe(true);
            expect(userRepository.existsByEmail).toHaveBeenCalledWith(
                'cobalt@example.com'
            );
        });
    });

    describe('assertEmailAvailable', () => {
        it('passes for a free email', () => {
            expect(() => service.assertEmailAvailable(false)).not.toThrow();
        });

        it('throws UserEmailExistException when the email is taken', () => {
            expect(() => service.assertEmailAvailable(true)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.emailExist,
                    statusCodeKey:
                        EnumUserStatusCodeError[
                            EnumUserStatusCodeError.emailExist
                        ],
                    messagePath: 'user.error.emailExist',
                })
            );
        });
    });

    describe('assertUsernameAvailable', () => {
        const clear = { badWord: false, exist: false, pattern: false };

        it('passes for an allowed, clean, free username', () => {
            expect(() => service.assertUsernameAvailable(clear)).not.toThrow();
        });

        it('throws UserUsernameNotAllowedException when the username breaks the pattern', () => {
            expect(() =>
                service.assertUsernameAvailable({
                    ...clear,
                    pattern: true,
                    badWord: true,
                    exist: true,
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.usernameNotAllowed,
                    messagePath: 'user.error.usernameNotAllowed',
                })
            );
        });

        it('throws UserUsernameContainBadWordException when the username is profane', () => {
            expect(() =>
                service.assertUsernameAvailable({
                    ...clear,
                    badWord: true,
                    exist: true,
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.usernameContainBadWord,
                    messagePath: 'user.error.usernameContainBadWord',
                })
            );
        });

        it('throws UserUsernameExistException when the username is taken', () => {
            expect(() =>
                service.assertUsernameAvailable({ ...clear, exist: true })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.usernameExist,
                    messagePath: 'user.error.usernameExist',
                })
            );
        });
    });

    describe('checkUsername', () => {
        it('combines the pattern, bad-word and existence checks', async () => {
            userUtil.checkUsernamePattern.mockReturnValue(true);
            userUtil.checkBadWord.mockResolvedValue(false);
            userRepository.existsByUsername.mockResolvedValue(true);

            await expect(service.checkUsername('cobaltReyes')).resolves.toEqual(
                {
                    badWord: false,
                    exist: true,
                    pattern: true,
                }
            );
        });
    });

    describe('checkEmail', () => {
        it('combines the bad-word and existence checks', async () => {
            userUtil.checkBadWord.mockResolvedValue(true);
            userRepository.existsByEmail.mockResolvedValue(false);

            await expect(
                service.checkEmail('cobalt@example.com')
            ).resolves.toEqual({
                badWord: true,
                exist: false,
            });
        });
    });

    describe('assertNotSelf', () => {
        it('passes for a different user', () => {
            expect(() =>
                service.assertNotSelf('user-cobalt', 'admin-cobalt')
            ).not.toThrow();
        });

        it('throws UserNotSelfException when the target is the actor', () => {
            expect(() =>
                service.assertNotSelf('user-cobalt', 'user-cobalt')
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.notSelf,
                    messagePath: 'user.error.notSelf',
                })
            );
        });
    });

    describe('getOneWithRole', () => {
        it('returns the user with its role', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(service.getOneWithRole('user-cobalt')).resolves.toBe(
                baseUser
            );
        });

        it('throws UserNotFoundException when the user is missing', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            await expect(
                service.getOneWithRole('user-cobalt')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
                messagePath: 'user.error.notFound',
            });
        });
    });

    describe('assertSelfDeletable', () => {
        it('passes when the util does not refuse the user', () => {
            userUtil.isDeleteSelfRefused.mockReturnValue(false);

            expect(() => service.assertSelfDeletable(baseUser)).not.toThrow();
            expect(userUtil.isDeleteSelfRefused).toHaveBeenCalledWith(baseUser);
        });

        it('throws UserDeleteSelfForbiddenException when the util refuses the user', () => {
            userUtil.isDeleteSelfRefused.mockReturnValue(true);

            expect(() => service.assertSelfDeletable(baseUser)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.deleteSelfForbidden,
                    messagePath: 'user.error.deleteSelfForbidden',
                })
            );
        });
    });

    describe('assertUnblocked', () => {
        it('passes for a user that is not blocked', () => {
            expect(() => service.assertUnblocked(baseUser)).not.toThrow();
        });

        it('throws UserBlockedInvalidException when the user is blocked', () => {
            expect(() =>
                service.assertUnblocked({
                    ...baseUser,
                    status: EnumUserStatus.blocked,
                })
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.blockedInvalid,
                    messagePath: 'user.error.blockedInvalid',
                })
            );
        });
    });

    describe('updateStatusByAdminInTx', () => {
        const target: IUser = { ...baseUser, passwordAttempt: 4 };

        it('writes the status guarded on the current one and resets the attempt counter when the user is activated', async () => {
            userRepository.updateStatusByAdminInTx.mockResolvedValue(baseUser);

            await expect(
                service.updateStatusByAdminInTx(
                    tx,
                    { ...target, status: EnumUserStatus.inactive },
                    EnumUserStatus.active
                )
            ).resolves.toBe(baseUser);

            expect(userRepository.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                target.id,
                EnumUserStatus.inactive,
                { status: EnumUserStatus.active, passwordAttempt: 0 }
            );
        });

        it('keeps the attempt counter when the user is not activated', async () => {
            userRepository.updateStatusByAdminInTx.mockResolvedValue(baseUser);

            await service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.active },
                EnumUserStatus.inactive
            );

            expect(userRepository.updateStatusByAdminInTx).toHaveBeenCalledWith(
                tx,
                target.id,
                EnumUserStatus.active,
                { status: EnumUserStatus.inactive, passwordAttempt: 4 }
            );
        });

        it('resets the two-factor attempt counter in the same transaction when activating', async () => {
            userRepository.updateStatusByAdminInTx.mockResolvedValue(baseUser);

            await service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.inactive },
                EnumUserStatus.active
            );

            expect(userTwoFactorService.resetAttemptInTx).toHaveBeenCalledWith(
                tx,
                target.id
            );
        });

        it('leaves the two-factor counter when the status is not active', async () => {
            userRepository.updateStatusByAdminInTx.mockResolvedValue(baseUser);

            await service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.active },
                EnumUserStatus.inactive
            );

            expect(
                userTwoFactorService.resetAttemptInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserStatusInvalidException without writing when the status is unchanged', async () => {
            const call = service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.active },
                EnumUserStatus.active
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.statusInvalid
                    ],
                messagePath: 'user.error.statusInvalid',
                httpStatus: 400,
            });
            expect(
                userRepository.updateStatusByAdminInTx
            ).not.toHaveBeenCalled();
        });

        it('throws UserStatusInvalidException when the current status no longer holds', async () => {
            userRepository.updateStatusByAdminInTx.mockResolvedValue(null);

            const call = service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.active },
                EnumUserStatus.inactive
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.statusInvalid,
                messagePath: 'user.error.statusInvalid',
            });
            expect(
                userTwoFactorService.resetAttemptInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('deleteSelfInTx', () => {
        it('soft-deletes with the deleted identity', async () => {
            const identity: IUserDeletedIdentity = {
                email: 'deleted.user-cobalt.cobalt@example.com',
                username: 'deleted.user-cobalt.cobaltReyes',
            };
            userUtil.createDeletedIdentity.mockReturnValue(identity);
            userRepository.deleteSelfInTx.mockResolvedValue(baseUser);

            await expect(
                service.deleteSelfInTx(tx, baseUser, now)
            ).resolves.toBe(baseUser);

            expect(userUtil.createDeletedIdentity).toHaveBeenCalledWith(
                baseUser
            );
            expect(userRepository.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                identity,
                now
            );
        });
    });
});
