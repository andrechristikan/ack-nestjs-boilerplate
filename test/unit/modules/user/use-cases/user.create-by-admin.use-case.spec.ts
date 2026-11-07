import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Country, TwoFactor } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
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
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCreateByAdminUseCase } from '@modules/user/use-cases/user.create-by-admin.use-case';

describe('UserCreateByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    let useCase: UserCreateByAdminUseCase;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.create.timeoutInMs': 5000,
        'user.create.bulkTimeoutInMs': 30000,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-bramble',
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
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
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
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
    const password: IAuthPassword = {
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
            to: 'bramble@example.com',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        },
        workspaceContext: personalContext,
        createdBy: 'user-bramble',
    };
    const historyEntry: IPasswordHistoryCreate = {
        userId: 'user-bramble',
        password: 'hashed',
        type: EnumPasswordHistoryType.signUp,
        expiredAt: password.passwordPeriodExpired,
        createdAt: password.passwordCreated,
        createdBy: 'user-bramble',
    };
    const acceptanceEntry: ITermPolicyAcceptanceCreate = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
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
        type: EnumRoleType.user,
        isImmutable: false,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        activityLogService.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userService.createManyInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildPasswordHistoryEntries.mockReturnValue([
            historyEntry,
        ]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            acceptanceEntry,
        ]);
        userCreateUtil.buildUserIds.mockReturnValue(['user-bramble']);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreateByAdminUseCase,
                { provide: UserService, useValue: userService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: NotificationService, useValue: notificationService },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
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
            role: { ...baseUser.role, type: EnumRoleType.admin },
            roleId: 'role-actor-bramble',
        };

        beforeEach(() => {
            roleService.getById.mockResolvedValue(role);
            userService.existsByEmail.mockResolvedValue(false);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userService.prepareCreateByAdmin.mockResolvedValue({
                input,
                passwordString: 'random-password',
            });
            userCreateUtil.buildCreateByAdminStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits once without the policy assertion, stages the rows, and sends the welcome with the generated password', async () => {
            await expect(useCase.execute(dto, actor)).resolves.toEqual({
                data: { id: 'user-bramble' },
            });

            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
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
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
            expect(
                userCreateUtil.buildCreateByAdminStages
            ).toHaveBeenCalledWith(input, committedUser);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'random-password',
                    passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                },
                'admin-bramble'
            );
        });

        it('sends no welcome when the created account carries no password', async () => {
            userService.prepareCreateByAdmin.mockResolvedValue({
                input: { ...input, password: null, passwordHistoryType: null },
                passwordString: 'random-password',
            });

            await useCase.execute(dto, actor);

            expect(notificationQueue.sendWelcomeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before the rank and identity gates when the role is missing', async () => {
            roleService.getById.mockRejectedValue(new RoleNotFoundException());

            await expect(useCase.execute(dto, actor)).rejects.toMatchObject({
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

            await expect(useCase.execute(dto, actor)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleService.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
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

            await expect(useCase.execute(dto, actor)).rejects.toMatchObject({
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

            await expect(useCase.execute(dto, actor)).rejects.toMatchObject({
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
        it('runs the writes on one transaction in order without the published assertion', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-bramble',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const users = await useCase['createAdminUsers']([input], 7000);

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 7000 }
            );
            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                input,
            ]);
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [historyEntry]
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble']);
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
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(
                passwordHistoryService.createManyInTx
            ).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledBefore(workspaceService.createOwnedForUsersInTx);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const users = await useCase['createAdminUsers']([input], 5000);

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
                1
            );
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                useCase['createAdminUsers']([input], 5000)
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the create util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userCreateUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                useCase['createAdminUsers']([input], 5000)
            ).rejects.toBe(mapped);
            expect(userCreateUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the create util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                useCase['createAdminUsers']([input], 5000)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
