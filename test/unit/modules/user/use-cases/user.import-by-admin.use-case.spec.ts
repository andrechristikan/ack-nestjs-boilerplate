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
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportUsernameChecks,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserImportByAdminUseCase } from '@modules/user/use-cases/user.import-by-admin.use-case';

describe('UserImportByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
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
    let useCase: UserImportByAdminUseCase;

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
                UserImportByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: UserImportService, useValue: userImportService },
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
        useCase = module.get(UserImportByAdminUseCase);
    });

    describe('execute', () => {
        const rows: UserImportRequestDto[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com' as Lowercase<string>,
            },
        ];
        const imported: IUserImport[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com',
                name: null,
            },
        ];
        const usernameChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false],
        };

        beforeEach(() => {
            countryService.getIdByAlpha2Code.mockResolvedValue(
                'country-bramble'
            );
            userImportService.getExistingEmails.mockResolvedValue([]);
            userImportService.getUsernameChecks.mockResolvedValue(
                usernameChecks
            );
            userImportService.prepareImportByAdmin.mockResolvedValue({
                inputs: [input],
                passwordHasheds: [password],
                passwordStrings: ['random-password'],
            });
            userCreateUtil.buildImportByAdminStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('checks the emails, prepares, commits in bulk with the bulk timeout, stages the rows, and enqueues the welcomes', async () => {
            await expect(
                useCase.execute(rows, 'admin-bramble')
            ).resolves.toEqual({});

            expect(userImportService.getExistingEmails).toHaveBeenCalledWith([
                'bramble@example.com',
            ]);
            expect(userImportService.getUsernameChecks).toHaveBeenCalledWith([
                'bramble2fox',
            ]);
            expect(
                userImportService.assertEmailsAvailable
            ).toHaveBeenCalledWith([]);
            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(countryService.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportService.prepareImportByAdmin).toHaveBeenCalledWith(
                imported,
                'admin-bramble',
                role,
                'country-bramble',
                usernameChecks
            );
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
            expect(
                userCreateUtil.buildImportByAdminStages
            ).toHaveBeenCalledWith([input], [committedUser]);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(
                notificationQueue.sendWelcomeByAdminBulk
            ).toHaveBeenCalledWith(
                [
                    {
                        recipient,
                        data: {
                            password: 'random-password',
                            passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                            passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                        },
                    },
                ],
                'admin-bramble'
            );
        });

        it('reads the role and the country before preparing the import', async () => {
            await useCase.execute(rows, 'admin-bramble');

            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(countryService.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportService.prepareImportByAdmin).toHaveBeenCalledWith(
                imported,
                'admin-bramble',
                role,
                'country-bramble',
                usernameChecks
            );
        });

        it('throws the email error before reading the default role', async () => {
            userImportService.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportService.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                useCase.execute(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
            });
            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(countryService.getIdByAlpha2Code).not.toHaveBeenCalled();
        });

        it('throws the import email exception before the role and country gates', async () => {
            userImportService.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportService.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                useCase.execute(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
            });
            expect(
                userImportService.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userImportService.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before preparing when the default country is missing', async () => {
            countryService.getIdByAlpha2Code.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                useCase.execute(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(
                userImportService.prepareImportByAdmin
            ).not.toHaveBeenCalled();
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
