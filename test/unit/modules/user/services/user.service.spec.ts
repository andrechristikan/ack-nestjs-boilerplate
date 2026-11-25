import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
import { AwsSesService } from '@common/aws/services/aws.ses.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthPassword,
    IAuthPasswordTemporary,
} from '@modules/auth/interfaces/auth.interface';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import type {
    IRole,
    IRoleWithPolicies,
} from '@modules/role/interfaces/role.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserStatusInvalidException } from '@modules/user/exceptions/user.status-invalid.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserDeletedIdentity,
    IUserList,
    IUserProfile,
} from '@modules/user/interfaces/user.interface';
import type { IUserCreateVerification } from '@modules/user/interfaces/user.create.interface';
import { UserRepository } from '@modules/user/repositories/user.repository';
import { UserVerificationService } from '@modules/user/services/user.verification.service';
import { UserUtil } from '@modules/user/utils/user.util';
import type { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import { EnumPaginationType } from '@common/pagination/enums/pagination.enum';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import {
    buildAuthJwtAccessContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import {} from '@common/request/enums/request.status-code.enum';
import { MessageService } from '@common/message/services/message.service';
import { HelperHashService } from '@common/helper/services/helper.hash.service';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('UserService', () => {
    const userRepository: MockProxy<UserRepository> = mock<UserRepository>();
    const userVerificationService: MockProxy<UserVerificationService> =
        mock<UserVerificationService>();
    const awsSesService: MockProxy<AwsSesService> = mock<AwsSesService>();
    const authPasswordService: MockProxy<AuthPasswordService> =
        mock<AuthPasswordService>();

    let service: UserService;
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;

    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'user.deleteSelfEmailPattern': 'deleted.{id}',
        'user.deleteSelfUsernamePattern': 'deleted.{id}',
    };

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
    const baseUser: IUser = {
        ...buildUser('user-cobalt', 'cobalt@example.com'),
        isVerified: true,
        roleId: role.id,
        role,
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: UserRepository, useValue: userRepository },
                UserUtil,
                UserVerificationUtil,
                UserCreateUtil,
                {
                    provide: UserVerificationService,
                    useValue: userVerificationService,
                },
                { provide: AwsSesService, useValue: awsSesService },
                { provide: AuthPasswordService, useValue: authPasswordService },
                DatabaseUtil,
                HelperDateService,
                HelperStringService,
                HelperHashService,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserService);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('assertEmailDeliverable', () => {
        it('throws AwsSesNotConfiguredException when SES is not initialized', () => {
            awsSesService.isInitialized.mockReturnValue(false);

            expect(() => service.assertEmailDeliverable()).toThrow(
                AwsSesNotConfiguredException
            );
        });

        it('returns when SES is initialized', () => {
            awsSesService.isInitialized.mockReturnValue(true);

            expect(() => service.assertEmailDeliverable()).not.toThrow();
        });
    });

    describe('validateUserGuard', () => {
        it('throws UserAccountNotFoundException when the user row is gone', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(null);

            const call = service.validateUserGuard(
                {
                    ...buildAuthJwtAccessContext('user-cobalt'),
                    loginWith: EnumUserLoginWith.credential,
                },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.accountNotFound,
            });
        });

        it('throws UserBlockedForbiddenException when the user is blocked', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.blocked,
            });

            const call = service.validateUserGuard(
                {
                    ...buildAuthJwtAccessContext('user-cobalt'),
                    loginWith: EnumUserLoginWith.credential,
                },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.blockedForbidden,
            });
        });

        it('throws UserInactiveForbiddenException when the user is not active', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                status: EnumUserStatus.inactive,
            });

            const call = service.validateUserGuard(
                {
                    ...buildAuthJwtAccessContext('user-cobalt'),
                    loginWith: EnumUserLoginWith.credential,
                },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.inactiveForbidden,
            });
        });

        it('skips the password expiry check for a social session', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
            });

            await expect(
                service.validateUserGuard(
                    {
                        ...buildAuthJwtAccessContext('user-cobalt'),
                        loginWith: EnumUserLoginWith.socialGoogle,
                    },
                    false
                )
            ).resolves.toEqual({
                ...baseUser,
                passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
            });
        });

        it('throws UserPasswordExpiredException for an expired credential session', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                passwordExpired: new Date('2026-02-01T00:00:00.000Z'),
            });

            const call = service.validateUserGuard(
                {
                    ...buildAuthJwtAccessContext('user-cobalt'),
                    loginWith: EnumUserLoginWith.credential,
                },
                false
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.passwordExpired,
            });
        });

        it('throws UserEmailNotVerifiedException when verification is required and missing', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue({
                ...baseUser,
                isVerified: false,
            });

            const call = service.validateUserGuard(
                {
                    ...buildAuthJwtAccessContext('user-cobalt'),
                    loginWith: EnumUserLoginWith.credential,
                },
                true
            );

            await expect(call).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailNotVerified,
            });
        });

        it('returns the user when every check passes', async () => {
            userRepository.findOneWithRoleById.mockResolvedValue(baseUser);

            await expect(
                service.validateUserGuard(
                    {
                        ...buildAuthJwtAccessContext('user-cobalt'),
                        loginWith: EnumUserLoginWith.credential,
                    },
                    true
                )
            ).resolves.toEqual(baseUser);
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledWith(
                'user-cobalt'
            );
            expect(userRepository.findOneWithRoleById).toHaveBeenCalledTimes(1);
        });
    });

    describe('getListOffsetByAdmin', () => {
        it('delegates to the repository', async () => {
            const params: IPaginationQueryOffsetParams = {
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
                lastIpAddress: null,
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
            const pagination: IPaginationQueryOffsetParams = {
                skip: 0,
                limit: 20,
                orderBy: [],
            };
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

    describe('getManyActiveRecipientsByIds', () => {
        it('delegates to the repository with the creation bound', async () => {
            const rows = [
                {
                    id: 'user-a',
                    email: 'a@example.com',
                    username: 'a',
                    name: null,
                },
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

    describe('createManyInTx', () => {
        const verification: IUserCreateVerification = {
            reference: 'ref-cobalt',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
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
            login: null,
            workspaceContext: {
                type: EnumUserCreateWorkspaceContextType.personal,
                workspaceId: 'workspace-cobalt',
                slugCandidates: ['w-cobalt'],
                name: "cobaltReyes's Workspace",
            },
            createdAt: now,
            createdBy: 'user-cobalt',
        };
        const withoutVerification: IUserCreateWithWorkspaceInput = {
            ...withVerification,
            userId: 'user-marigold',
            verification: null,
            createdBy: 'admin-cobalt',
        };
        const secondVerification: IUserCreateVerification = {
            ...verification,
            reference: 'ref-saffron',
            to: 'saffron@example.com',
        };
        const saffron: IUserCreateWithWorkspaceInput = {
            ...withVerification,
            userId: 'user-saffron',
            verification: secondVerification,
            createdBy: 'user-saffron',
        };

        it('writes every user with one repository call and every verification with one verification call', async () => {
            await service.createManyInTx(tx, [
                withVerification,
                withoutVerification,
                saffron,
            ]);

            expect(userRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(userRepository.createManyInTx).toHaveBeenCalledWith(tx, [
                withVerification,
                withoutVerification,
                saffron,
            ]);
            expect(
                userVerificationService.createManyInTx
            ).toHaveBeenCalledTimes(1);
            expect(userVerificationService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-cobalt',
                        createdBy: 'user-cobalt',
                        ...verification,
                    },
                    {
                        userId: 'user-saffron',
                        createdBy: 'user-saffron',
                        ...secondVerification,
                    },
                ]
            );
        });

        it('writes no verification when no input carries one', async () => {
            await service.createManyInTx(tx, [withoutVerification]);

            expect(userRepository.createManyInTx).toHaveBeenCalledTimes(1);
            expect(
                userVerificationService.createManyInTx
            ).not.toHaveBeenCalled();
        });

        it('issues no verification statement for an empty list', async () => {
            await service.createManyInTx(tx, []);

            expect(
                userVerificationService.createManyInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('createInTx', () => {
        const verification: IUserCreateVerification = {
            reference: 'ref-cobalt',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'cobalt@example.com',
            expiredAt: new Date('2026-02-01T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        };
        const input: IUserCreateWithWorkspaceInput = {
            userId: 'user-cobalt',
            email: 'cobalt@example.com',
            name: 'Cobalt Reyes',
            username: 'cobaltReyes',
            countryId: 'country-cobalt',
            roleId: role.id,
            signUpFrom: EnumUserSignUpFrom.website,
            signUpWith: EnumUserSignUpWith.socialGoogle,
            isVerified: true,
            verifiedAt: now,
            acceptedTermPolicyTypes: [],
            password: null,
            passwordHistoryType: null,
            verification: null,
            login: null,
            workspaceContext: {
                type: EnumUserCreateWorkspaceContextType.personal,
                workspaceId: 'workspace-cobalt',
                slugCandidates: ['w-cobalt'],
                name: "cobaltReyes's Workspace",
            },
            createdAt: now,
            createdBy: 'user-cobalt',
        };

        it('returns the created user and writes no verification for an input without one', async () => {
            userRepository.createInTx.mockResolvedValue(baseUser);

            const result = await service.createInTx(tx, input);

            expect(userRepository.createInTx).toHaveBeenCalledWith(tx, input);
            expect(
                userVerificationService.createManyInTx
            ).not.toHaveBeenCalled();
            expect(result).toBe(baseUser);
        });

        it('writes the verification of an input that carries one', async () => {
            userRepository.createInTx.mockResolvedValue(baseUser);

            await service.createInTx(tx, { ...input, verification });

            expect(userVerificationService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-cobalt',
                        createdBy: 'user-cobalt',
                        ...verification,
                    },
                ]
            );
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

    describe('resetPasswordAttemptInTx', () => {
        it('resets the counter and lock on the given transaction', async () => {
            userRepository.resetPasswordAttemptInTx.mockResolvedValue(baseUser);

            await expect(
                service.resetPasswordAttemptInTx(tx, baseUser.id)
            ).resolves.toBeUndefined();

            expect(
                userRepository.resetPasswordAttemptInTx
            ).toHaveBeenCalledWith(tx, baseUser.id);
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
        it('forwards the caller reset flag when the caller proved the password', async () => {
            const user = baseUser;
            userRepository.updateLoginInTx.mockResolvedValue(user);

            await expect(
                service.updateLoginInTx(
                    tx,
                    user.id,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    '127.0.0.1',
                    now,
                    true
                )
            ).resolves.toBe(user);

            expect(userRepository.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                '127.0.0.1',
                now,
                true
            );
        });

        it('forwards no reset for a credential session the caller did not re-prove', async () => {
            const user = baseUser;
            userRepository.updateLoginInTx.mockResolvedValue(user);

            await service.updateLoginInTx(
                tx,
                user.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                null,
                now,
                false
            );

            expect(userRepository.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                user.id,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                null,
                now,
                false
            );
        });
    });

    describe('touchUpdatedByInTx', () => {
        it('forwards the password check flag to the repository', async () => {
            await service.touchUpdatedByInTx(tx, 'user-cobalt', true);

            expect(userRepository.touchUpdatedByInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                true
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
                    name: null,
                },
                {
                    id: 'user-indigo',
                    email: 'indigo@example.com',
                    username: 'indigo',
                    name: null,
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
            reference: 'VRF-verify-ref',
            token: '458ba985765983a9f2054fa2073b5e80e253c3e842266cbf6f10310945c374be',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: input.email,
            expiredAt: new Date('2026-03-01T00:15:00.000Z'),
            verifiedAt: now,
            isUsed: true,
        };
        const temporaryPassword: IAuthPasswordTemporary = {
            passwordHash: 'hashed',
            passwordExpired: new Date('2026-03-01T01:00:00.000Z'),
            passwordCreated: now,
            passwordPeriodExpired: new Date('2026-05-30T00:00:00.000Z'),
        };

        beforeEach(() => {
            vi.spyOn(databaseUtil, 'createId')
                .mockReturnValueOnce('user-id-cobalt')
                .mockReturnValueOnce('workspace-cobalt');
            authPasswordService.createRandom.mockReturnValue('random-password');
            authPasswordService.create.mockResolvedValue(temporaryPassword);
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('cobalt-a')
                .mockReturnValueOnce('cobalt-b')
                .mockReturnValueOnce('cobalt-c')
                .mockReturnValueOnce('verify-token')
                .mockReturnValueOnce('verify-ref');
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
                acceptedTermPolicyTypes: [],
                createdAt: now,
                createdBy: 'admin-cobalt',
            });
            expect(result.input.verification).toEqual(verified);
            expect(authPasswordService.create).toHaveBeenCalledWith(
                'random-password',
                { temporary: true }
            );
            expect(result.input.password).toBe(temporaryPassword);
            expect(result.input.workspaceContext).toEqual({
                type: EnumUserCreateWorkspaceContextType.personal,
                workspaceId: 'workspace-cobalt',
                slugCandidates: ['w-cobalt-a', 'w-cobalt-b', 'w-cobalt-c'],
                name: "cobaltReyes's Workspace",
            });
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

    describe('assertAllExist', () => {
        it('resolves when the count equals the number of ids', async () => {
            userRepository.countByIds.mockResolvedValue(2);

            await expect(
                service.assertAllExist(['user-cobalt', 'admin-cobalt'])
            ).resolves.toBeUndefined();
            expect(userRepository.countByIds).toHaveBeenCalledWith([
                'user-cobalt',
                'admin-cobalt',
            ]);
        });

        it('throws UserNotFoundException when the count is lower than the number of ids', async () => {
            userRepository.countByIds.mockResolvedValue(1);

            await expect(
                service.assertAllExist(['user-cobalt', 'admin-cobalt'])
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.notFound,
            });
        });

        it('resolves without a query for an empty list', async () => {
            await expect(service.assertAllExist([])).resolves.toBeUndefined();
            expect(userRepository.countByIds).not.toHaveBeenCalled();
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
                })
            );
        });
    });

    describe('checkUsername', () => {
        it('combines the pattern, bad-word and existence checks', async () => {
            userRepository.existsByUsername.mockResolvedValue(true);

            await expect(
                service.checkUsername('cobalt reyes')
            ).resolves.toEqual({
                badWord: false,
                exist: true,
                pattern: true,
            });
        });

        it('reports the pattern as valid for an allowed username', async () => {
            userRepository.existsByUsername.mockResolvedValue(false);

            await expect(
                service.checkUsername('marigoldFinch')
            ).resolves.toEqual({
                badWord: false,
                exist: false,
                pattern: false,
            });
        });
    });

    describe('checkEmail', () => {
        it('combines the bad-word and existence checks', async () => {
            userRepository.existsByEmail.mockResolvedValue(false);

            await expect(
                service.checkEmail('damn@example.com')
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
            });
        });
    });

    describe('assertSelfDeletable', () => {
        it('passes for a user role', () => {
            expect(() => service.assertSelfDeletable(baseUser)).not.toThrow();
        });

        it('throws UserDeleteSelfForbiddenException for an admin role', () => {
            const admin: IUser = {
                ...baseUser,
                role: { ...role, type: EnumRoleType.admin },
            };

            expect(() => service.assertSelfDeletable(admin)).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.deleteSelfForbidden,
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
                })
            );
        });
    });

    describe('assertStatusChangeable', () => {
        it('passes when the status differs from the current one', () => {
            expect(() =>
                service.assertStatusChangeable(
                    { ...baseUser, status: EnumUserStatus.active },
                    EnumUserStatus.inactive
                )
            ).not.toThrow();
        });

        it('throws UserStatusInvalidException when the status is unchanged', () => {
            expect(() =>
                service.assertStatusChangeable(
                    { ...baseUser, status: EnumUserStatus.active },
                    EnumUserStatus.active
                )
            ).toThrow(
                expect.objectContaining({
                    module: 'user',
                    statusCode: EnumUserStatusCodeError.statusInvalid,
                })
            );
        });
    });

    describe('updateStatusByAdminInTx', () => {
        const lockedUntil = new Date('2026-03-01T00:15:00.000Z');
        const target: IUser = {
            ...baseUser,
            passwordAttempt: 4,
            passwordLockedUntil: lockedUntil,
        };

        it('writes the status guarded on the current one and clears the attempt counter and the lock when the user is activated', async () => {
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
                {
                    status: EnumUserStatus.active,
                    passwordAttempt: 0,
                    passwordLockedUntil: null,
                }
            );
        });

        it('passes the current attempt counter and lock when the user is not activated', async () => {
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
                {
                    status: EnumUserStatus.inactive,
                    passwordAttempt: 4,
                    passwordLockedUntil: lockedUntil,
                }
            );
        });

        it('passes the UserStatusInvalidException the repository rejected through untouched', async () => {
            const rejected = new UserStatusInvalidException();
            userRepository.updateStatusByAdminInTx.mockRejectedValue(rejected);

            const call = service.updateStatusByAdminInTx(
                tx,
                { ...target, status: EnumUserStatus.active },
                EnumUserStatus.inactive
            );

            await expect(call).rejects.toBe(rejected);
        });
    });

    describe('deleteSelfInTx', () => {
        it('soft-deletes with the deleted identity built from the id given', async () => {
            const identity: IUserDeletedIdentity = {
                email: 'deleted.user-cobalt',
                username: 'deleted.user-cobalt',
            };
            userRepository.deleteSelfInTx.mockResolvedValue();

            await expect(
                service.deleteSelfInTx(tx, 'user-cobalt', now)
            ).resolves.toBeUndefined();

            expect(userRepository.deleteSelfInTx).toHaveBeenCalledWith(
                tx,
                'user-cobalt',
                identity,
                now
            );
        });
    });

    describe('getOneLive', () => {
        it('returns the live row of any status', async () => {
            const row = { ...baseUser, status: EnumUserStatus.blocked };
            userRepository.findOneById.mockResolvedValue(row);

            await expect(service.getOneLive('user-cobalt')).resolves.toBe(row);

            expect(userRepository.findOneById).toHaveBeenCalledWith(
                'user-cobalt'
            );
        });

        it('returns null when the user is deleted or missing', async () => {
            userRepository.findOneById.mockResolvedValue(null);

            await expect(service.getOneLive('user-cobalt')).resolves.toBeNull();
        });
    });

    describe('resolveStatusActivityLogAction', () => {
        it('resolves userBlockedByAdmin for blocked', () => {
            expect(
                service.resolveStatusActivityLogAction(EnumUserStatus.blocked)
            ).toBe(EnumActivityLogAction.userBlockedByAdmin);
        });

        it('resolves userStatusUpdatedByAdmin for inactive', () => {
            expect(
                service.resolveStatusActivityLogAction(EnumUserStatus.inactive)
            ).toBe(EnumActivityLogAction.userStatusUpdatedByAdmin);
        });

        it('resolves userStatusUpdatedByAdmin for active', () => {
            expect(
                service.resolveStatusActivityLogAction(EnumUserStatus.active)
            ).toBe(EnumActivityLogAction.userStatusUpdatedByAdmin);
        });
    });

    describe('revokesSessionsOn', () => {
        it('returns false for active', () => {
            expect(service.revokesSessionsOn(EnumUserStatus.active)).toBe(
                false
            );
        });

        it('returns true for inactive', () => {
            expect(service.revokesSessionsOn(EnumUserStatus.inactive)).toBe(
                true
            );
        });

        it('returns true for blocked', () => {
            expect(service.revokesSessionsOn(EnumUserStatus.blocked)).toBe(
                true
            );
        });
    });

    describe('resetsMfaAttemptOn', () => {
        it('returns true for active', () => {
            expect(service.resetsMfaAttemptOn(EnumUserStatus.active)).toBe(
                true
            );
        });

        it('returns false for inactive', () => {
            expect(service.resetsMfaAttemptOn(EnumUserStatus.inactive)).toBe(
                false
            );
        });

        it('returns false for blocked', () => {
            expect(service.resetsMfaAttemptOn(EnumUserStatus.blocked)).toBe(
                false
            );
        });
    });

    describe('createDeletedIdentity', () => {
        it('fills the configured deleted pattern from the row id alone for both fields', () => {
            expect(service['createDeletedIdentity'](baseUser.id)).toEqual({
                email: 'deleted.user-cobalt',
                username: 'deleted.user-cobalt',
            });
        });
    });

    describe('isDeleteSelfRefused', () => {
        it('returns true for admin and superAdmin', () => {
            expect(
                service['isDeleteSelfRefused']({
                    ...baseUser,
                    role: { ...role, type: EnumRoleType.admin },
                })
            ).toBe(true);
            expect(
                service['isDeleteSelfRefused']({
                    ...baseUser,
                    role: { ...role, type: EnumRoleType.superAdmin },
                })
            ).toBe(true);
        });

        it('returns false for user', () => {
            expect(service['isDeleteSelfRefused'](baseUser)).toBe(false);
        });
    });

    describe('gatesPasswordExpiryOn', () => {
        it('returns true for credential', () => {
            expect(
                service['gatesPasswordExpiryOn'](EnumUserLoginWith.credential)
            ).toBe(true);
        });

        it('returns false for socialGoogle', () => {
            expect(
                service['gatesPasswordExpiryOn'](EnumUserLoginWith.socialGoogle)
            ).toBe(false);
        });

        it('returns false for socialApple', () => {
            expect(
                service['gatesPasswordExpiryOn'](EnumUserLoginWith.socialApple)
            ).toBe(false);
        });
    });
});
