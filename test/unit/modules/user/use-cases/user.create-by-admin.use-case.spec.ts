import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
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
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
import type { Country } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthPasswordTemporary } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { EnumAwsStatusCodeError } from '@common/aws/enums/aws.status-code.enum';
import { AwsSesNotConfiguredException } from '@common/aws/exceptions/aws.ses-not-configured.exception';
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
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserCreateByAdminUseCase } from '@modules/user/use-cases/user.create-by-admin.use-case';
import {
    buildApiKeyContext,
    buildAuthJwtAccessContext,
    buildRequestContext,
    buildUser,
    buildUserContext,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('UserCreateByAdminUseCase', () => {
    const userService: MockProxy<UserService> = mock<UserService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const tx = {} as IDatabaseTransactionClient;
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    let useCase: UserCreateByAdminUseCase;

    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
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
    const baseUser: IUser = buildUser('user-bramble', 'bramble@example.com');
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
        type: EnumRoleType.user,
        isImmutable: false,
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        vi.setSystemTime(now);
        activityLogQueue.recordEffect.mockReturnValue(activityEntry);
        userRegistrationService.buildCreateByAdminStages.mockReturnValue([
            stageInput,
        ]);
        notificationQueue.notify.mockReturnValue(welcomeEffect);
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        userService.createManyInTx.mockResolvedValue([committedUser]);
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserCreateByAdminUseCase,
                { provide: UserService, useValue: userService },
                { provide: WorkspaceService, useValue: workspaceService },
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
                WorkspaceUtil,
                {
                    provide: UserRegistrationService,
                    useValue: userRegistrationService,
                },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: MfaService, useValue: mfaService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                UserCreateUtil,
                HelperStringService,
                HelperDateService,
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
        const requestContext = buildRequestContext();
        const apiKeyContext = buildApiKeyContext();
        const userContext = buildUserContext(actor);
        const authContext = buildAuthJwtAccessContext(actor.id);

        beforeEach(() => {
            roleService.getById.mockResolvedValue(role);
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

        it('answers AwsSesNotConfiguredException before any read when SES is unset', async () => {
            userService.assertEmailDeliverable.mockImplementation(() => {
                throw new AwsSesNotConfiguredException();
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
                module: 'aws',
                statusCode: EnumAwsStatusCodeError.sesNotConfigured,
            });
            expect(roleService.getById).not.toHaveBeenCalled();
            expect(userService.existsByEmail).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
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
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                input,
            ]);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeByAdmin,
                {
                    userId: 'user-bramble',
                    proceedBy: 'admin-bramble',
                    password: 'random-password',
                    passwordCreatedAt: '2026-01-01T00:00:00.000Z',
                    passwordExpiredAt: '2026-06-01T00:00:00.000Z',
                }
            );
            expect(
                userRegistrationService.buildCreateByAdminStages
            ).toHaveBeenCalledWith(input, committedUser);
            expect(activityLogQueue.recordEffect).toHaveBeenCalledWith(
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
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeByAdmin,
                expect.objectContaining({ proceedBy: 'actor-bramble' })
            );
        });

        it('throws RoleNotFoundException and asserts no rank when the role is missing', async () => {
            roleService.getById.mockRejectedValue(new RoleNotFoundException());

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
            });
            expect(roleService.assertActorOutranks).not.toHaveBeenCalled();
        });

        it('calls the email, username, and country checks while the role read is still pending', async () => {
            const roleRead = buildDeferred<IRole>();
            roleService.getById.mockReturnValue(roleRead.promise);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                userContext,
                dto
            );

            expect(userService.existsByEmail).toHaveBeenCalledWith(dto.email);
            expect(userService.checkUsername).toHaveBeenCalledWith(
                dto.username
            );
            expect(countryService.getOne).toHaveBeenCalledWith(dto.countryId);

            roleRead.resolve(role);
            await running;
        });

        it('throws the rank exception and prepares nothing', async () => {
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
                EnumRoleType.admin,
                EnumRoleType.user
            );
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
            types: [EnumTermPolicyType.termsOfService],
            createdBy: 'user-bramble',
        };
        const owned = {
            userId: 'user-bramble',
            workspaceId: 'workspace-bramble',
            name: "bramble2fox's Workspace",
            slug: 'w-bramble',
        };

        it('creates the users, their owned workspaces, and the term-policy acceptances on one tx, in that order', async () => {
            const users = await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                7000
            );

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                input,
            ]);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
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

        it("writes each user's Mfa row, password history, and notification defaults on tx after the users", async () => {
            await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                7000
            );

            expect(mfaService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble'
            );
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-bramble',
                        password: 'hashed',
                        type: EnumPasswordHistoryType.signUp,
                        expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                        createdAt: new Date('2026-01-01T00:00:00.000Z'),
                        createdBy: 'user-bramble',
                    },
                ]
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble']);
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                mfaService.createInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
            expect(mfaService.createInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
        });

        it('passes timeoutInMs to withTransaction', async () => {
            await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                7000
            );

            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 7000 }
            );
        });

        it('retries with the next attempt after a slug collision', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx));

            const users = await useCase['createAdminUsers'](
                requestContext,
                apiKeyContext,
                [input],
                [welcomeEffect],
                5000
            );

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenLastCalledWith(tx, [{ ...owned, slug: 'w-bramble-b' }]);
        });

        it('throws the mapped AppBaseException of mapCreateCollision', async () => {
            const otherError = buildPrismaKnownRequestError('P2002', 'email');
            databaseService.withTransaction.mockRejectedValue(otherError);

            await expect(
                useCase['createAdminUsers'](
                    requestContext,
                    apiKeyContext,
                    [input],
                    [welcomeEffect],
                    5000
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
            });
        });

        it('wraps an unmapped error in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);

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
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'slug')
            );

            await expect(
                useCase['createAdminUsers'](
                    requestContext,
                    apiKeyContext,
                    [input],
                    [welcomeEffect],
                    5000
                )
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });
    });
});
