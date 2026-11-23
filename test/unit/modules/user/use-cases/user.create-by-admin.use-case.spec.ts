import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { buildActivityLogCreateManyEffect } from '@test/unit/helpers/test.unit.activity-log-effect.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthPasswordTemporary } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCreateByAdminUseCase } from '@modules/user/use-cases/user.create-by-admin.use-case';
import {
    buildRequestContext,
    buildApiKeyContext,
    buildUserContext,
    buildAuthJwtAccessContext,
} from '@test/unit/helpers/test.unit.request.helper';

describe('UserCreateByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const tx = {} as IDatabaseTransactionClient;
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    let useCase: UserCreateByAdminUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.create.timeoutInMs': 5000,
        'user.create.bulkTimeoutInMs': 30000,
    };
    const activityEntry = buildActivityLogCreateManyEffect('activity-entry');
    const welcomeEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.welcomeByAdmin,
            context: {
                userId: 'user-bramble',
                proceedBy: 'admin-bramble',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'welcomeByAdmin-user-bramble',
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
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
        countryId: 'country-bramble',
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
        role: {
            id: 'role-bramble',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };
    const committedUser: IUser = baseUser;
    const country: Country = {
        id: 'country-bramble',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const personalContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const password: IAuthPasswordTemporary = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const input: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        verifiedAt: null,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        verification: {
            reference: 'VRF-bramble',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
            to: 'bramble@example.com',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        },
        workspaceContext: personalContext,
        createdBy: 'user-bramble',
    };
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'user-bramble',
        metadata: {},
    };
    const clearUsername: IUserCheckUsername = {
        badWord: false,
        exist: false,
        pattern: false,
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        scope: EnumRoleScope.platform,
        key: EnumRolePlatformKey.user,
        policyRevision: 0,
        description: null,
        isImmutable: false,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T07:00:00.000+07:00'
        );
        activityLogService.recordEffect.mockReturnValue(activityEntry);
        userRegistrationService.buildCreateByAdminStages.mockReturnValue([
            stageInput,
        ]);
        notificationService.notify.mockReturnValue(welcomeEffect);
        outboxService.withTransaction.mockImplementation(async fn => fn(tx));
        userRegistrationService.createInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            { userId: 'user-bramble', types: [], createdBy: 'user-bramble' },
        ]);
        workspaceUtil.countSlugAttempts.mockReturnValue(1);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleService.getRefByScopeAndKey.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreateByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: OutboxService, useValue: outboxService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                {
                    provide: UserRegistrationService,
                    useValue: userRegistrationService,
                },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationService, useValue: notificationService },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserCreateByAdminUseCase);
    });

    describe('execute', () => {
        const dto: UserCreateRequestDto = {
            username: 'bramble2fox',
            email: 'bramble@example.com' as Lowercase<string>,
            roleId: 'role-bramble',
            countryId: 'country-bramble',
        };
        const actor: IUser = {
            ...baseUser,
            id: 'admin-bramble',
            role: { ...baseUser.role, key: EnumRolePlatformKey.admin },
            roleId: 'role-actor-bramble',
        };
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(actor);
        const authContext = buildAuthJwtAccessContext(actor.id);

        beforeEach(() => {
            roleService.getRefByIdForScope.mockResolvedValue(role);
            userService.existsByEmail.mockResolvedValue(false);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userService.prepareCreateByAdmin.mockResolvedValue({
                input,
                password,
                passwordString: 'random-password',
            });
            userRegistrationService.buildCreateByAdminStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits once without the policy assertion, and adds the entries and the welcome effect with the generated password on the same tx', async () => {
            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).resolves.toEqual({
                data: { id: 'user-bramble' },
            });

            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRolePlatformKey.admin,
                role
            );
            expect(userService.prepareCreateByAdmin).toHaveBeenCalledWith(
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                    roleId: 'role-bramble',
                    countryId: 'country-bramble',
                },
                'admin-bramble',
                role
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(outboxService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [input]
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeByAdmin,
                {
                    userId: 'user-bramble',
                    proceedBy: 'admin-bramble',
                    password: 'random-password',
                    passwordCreatedAt: '2026-03-05T07:00:00.000+07:00',
                    passwordExpiredAt: '2026-03-05T07:00:00.000+07:00',
                }
            );
            expect(
                userRegistrationService.buildCreateByAdminStages
            ).toHaveBeenCalledWith(input, committedUser);
            expect(activityLogService.recordEffect).toHaveBeenCalledWith(
                requestContext,
                apiKeyContext,
                null,
                null,
                stageInput
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                activityEntry,
                welcomeEffect,
            ]);
        });

        it('reads the actor id from actorUserId', async () => {
            const actorAuthContext = {
                ...authContext,
                userId: 'actor-bramble',
            };

            await useCase.execute(
                requestContext,
                apiKeyContext,
                actorAuthContext,
                userContext,
                dto
            );

            expect(userService.prepareCreateByAdmin).toHaveBeenCalledWith(
                expect.objectContaining({ email: 'bramble@example.com' }),
                'actor-bramble',
                role
            );
            expect(notificationService.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeByAdmin,
                expect.objectContaining({ proceedBy: 'actor-bramble' })
            );
        });

        it('throws RoleNotFoundException before the rank and identity gates when the role is missing', async () => {
            roleService.getRefByIdForScope.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(roleService.assertActorOutranks).not.toHaveBeenCalled();
            expect(countryService.getOne).not.toHaveBeenCalled();
            expect(userService.existsByEmail).not.toHaveBeenCalled();
            expect(userService.checkUsername).not.toHaveBeenCalled();
        });

        it('throws the rank exception before any country or identity read', async () => {
            roleService.assertActorOutranks.mockImplementation(() => {
                throw new RoleRankForbiddenException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRolePlatformKey.admin,
                role
            );
            expect(countryService.getOne).not.toHaveBeenCalled();
            expect(userService.existsByEmail).not.toHaveBeenCalled();
            expect(userService.checkUsername).not.toHaveBeenCalled();
            expect(userService.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before the identity gates', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userService.assertEmailAvailable).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate', async () => {
            userService.existsByEmail.mockResolvedValue(true);
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    userContext,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(userService.prepareCreateByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('createAdminUsers', () => {
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const acceptanceEntry = {
            userId: 'user-bramble',
            types: [],
            createdBy: 'user-bramble',
        };
        const owned = {
            userId: 'user-bramble',
            workspaceId: 'workspace-bramble',
            name: 'Bramble',
            slug: 'w-bramble',
        };

        beforeEach(() => {
            userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
                acceptanceEntry,
            ]);
            workspaceUtil.countSlugAttempts.mockReturnValue(2);
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);
        });

        it('creates the users, their owned workspaces, and the term-policy acceptances on one tx, in that order', async () => {
            const users = await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                7000
            );

            expect(users).toEqual([committedUser]);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [input]
            );
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
                0
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);
            expect(userRegistrationService.createInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                activityEntry,
                welcomeEffect,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
        });

        it('passes timeoutInMs to withTransaction', async () => {
            await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                7000
            );

            expect(outboxService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 7000 }
            );
        });

        it('retries with the next attempt after a slug collision', async () => {
            const collision = new Error('slug collision');
            outboxService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const users = await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                5000
            );

            expect(users).toEqual([committedUser]);
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
                1
            );
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('throws the mapped AppBaseException of mapCreateCollision', async () => {
            const otherError = new Error('duplicate email');
            outboxService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new WorkspaceNotFoundException();
            userCreateUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                useCase['createAdminUsers'](
                    requestContext,
                    apiKeyContext,
                    [input],
                    [welcomeEffect],
                    5000
                )
            ).rejects.toBe(mapped);
            expect(userCreateUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps an unmapped error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            outboxService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                useCase['createAdminUsers'](
                    requestContext,
                    apiKeyContext,
                    [input],
                    [welcomeEffect],
                    5000
                )
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });

        it('throws DatabaseUniqueValueGenerationFailedException after the last attempt', async () => {
            outboxService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase['createAdminUsers'](
                    requestContext,
                    apiKeyContext,
                    [input],
                    [welcomeEffect],
                    5000
                )
            ).rejects.toBeInstanceOf(
                DatabaseUniqueValueGenerationFailedException
            );
            expect(outboxService.withTransaction).toHaveBeenCalledTimes(2);
        });
    });
});
