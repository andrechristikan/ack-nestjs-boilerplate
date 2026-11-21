import { setImmediate } from 'node:timers/promises';
import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
} from '@generated/prisma-client/client';
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
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportByAdminPayload,
    IUserSignUpWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserProcessImportByAdminUseCase } from '@modules/user/use-cases/user.process-import-by-admin.use-case';
import { WorkspaceNotFoundException } from '@modules/workspace/exceptions/workspace.not-found.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import {
    buildRequestLog,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';

describe('UserProcessImportByAdminUseCase', () => {
    const userImportService: MockProxy<UserImportService> =
        mock<UserImportService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const messageService: MockProxy<MessageService> = mock<MessageService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const tx = {} as IDatabaseTransactionClient;
    let useCase: UserProcessImportByAdminUseCase;

    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.create.bulkTimeoutInMs': 30000,
    };
    const activityLog: IActivityLogActorPayload = {
        apiKeyId: 'api-key-1',
        actorUserId: 'admin-bramble',
        workspaceId: null,
        requestLog: buildRequestLog(),
    };
    const rows: IUserImport[] = [
        {
            username: 'bramble2fox',
            email: 'bramble@example.com',
            name: null,
        },
    ];
    const payload: IUserImportByAdminPayload = {
        rows,
        activityLog,
        created: null,
    };
    const entryEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.welcomeByAdmin,
            context: {
                userId: 'entry',
                proceedBy: 'entry',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'entry',
    };
    const activityEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: 'activity',
    };
    const welcomeEffect: INotificationNotifyEffect = {
        ...entryEffect,
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'welcome',
    };
    const resultEffect: INotificationNotifyEffect = {
        ...entryEffect,
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'result',
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
    const password: IAuthPasswordTemporary = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const personalContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const input: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.admin,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
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
            verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
            isUsed: true,
        },
        workspaceContext: personalContext,
        createdBy: 'admin-bramble',
    };
    const committedUser: IUser = buildUser(
        'user-bramble',
        'bramble@example.com'
    );
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'admin-bramble',
        metadata: {},
    };
    const acceptanceEntry = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
        createdBy: 'admin-bramble',
    };
    const owned = {
        userId: 'user-bramble',
        workspaceId: 'workspace-bramble',
        name: "bramble2fox's Workspace",
        slug: 'w-bramble',
    };

    beforeEach(async () => {
        messageService.setMessage.mockImplementation((path: string) => path);
        activityLogQueue.recordEffectFromPayload.mockReturnValue(
            activityEffect
        );
        notificationQueue.notify.mockImplementation(kind =>
            kind === EnumNotificationKind.userImportResult
                ? resultEffect
                : welcomeEffect
        );
        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        roleService.getByName.mockResolvedValue(role);
        countryService.getIdByAlpha2Code.mockResolvedValue('country-bramble');
        userImportService.prepareImportByAdmin.mockResolvedValue({
            inputs: [input],
            passwordHasheds: [password],
            passwordStrings: ['random-password'],
        });
        userImportService.buildImportByAdminStages.mockReturnValue([
            stageInput,
        ]);
        userRegistrationService.createInTx.mockResolvedValue([committedUser]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserProcessImportByAdminUseCase,
                { provide: UserImportService, useValue: userImportService },
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
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                { provide: NotificationQueue, useValue: notificationQueue },
                UserCreateUtil,
                HelperStringService,
                HelperDateService,
                { provide: MessageService, useValue: messageService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserProcessImportByAdminUseCase);
    });

    describe('execute', () => {
        it('creates the users, then adds the activity, welcome, and result effects on one tx and dispatches once', async () => {
            const response = await useCase.execute('outbox-bramble', payload);

            expect(response).toEqual({
                message: 'user.queue.importByAdmin',
                created: 1,
                failed: 0,
            });
            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(countryService.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportService.prepareImportByAdmin).toHaveBeenCalledWith(
                rows,
                'admin-bramble',
                role,
                'country-bramble'
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
            expect(userRegistrationService.createInTx).toHaveBeenCalledWith(
                tx,
                [input]
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);
            expect(
                userImportService.buildImportByAdminStages
            ).toHaveBeenCalledWith([input], [committedUser]);
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenCalledWith(activityLog, stageInput);
            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                activityEffect,
                welcomeEffect,
                resultEffect,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('records the created count on the outbox row inside the transaction that creates the users', async () => {
            await useCase.execute('outbox-bramble', payload);

            expect(outboxService.updateDataInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-bramble',
                { created: 1 }
            );
            expect(userRegistrationService.createInTx).toHaveBeenCalledBefore(
                outboxService.updateDataInTx
            );
        });

        it('records the created count while the effects are still being added', async () => {
            const added = buildDeferred<string[]>();
            outboxService.addManyInTx.mockReturnValue(added.promise);

            const running = useCase.execute('outbox-bramble', payload);
            await setImmediate();

            expect(outboxService.addManyInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-bramble',
                { created: 1 }
            );

            added.resolve(['outbox-id']);

            await expect(running).resolves.toMatchObject({ created: 1 });
            expect(outboxService.updateDataInTx).toHaveBeenCalledWith(
                tx,
                'outbox-bramble',
                { created: 1 }
            );
        });

        it('returns the recorded result and touches no service when the payload already holds the created count', async () => {
            const response = await useCase.execute('outbox-bramble', {
                ...payload,
                created: 3,
            });

            expect(response).toEqual({
                message: 'user.queue.importByAdmin',
                created: 3,
                failed: 0,
            });
            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(countryService.getIdByAlpha2Code).not.toHaveBeenCalled();
            expect(
                userImportService.prepareImportByAdmin
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(outboxService.updateDataInTx).not.toHaveBeenCalled();
            expect(outboxService.addInTx).not.toHaveBeenCalled();
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalled();
        });

        it('notifies each created user with a welcome carrying the admin as the proceeding user', async () => {
            await useCase.execute('outbox-bramble', payload);

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
        });

        it('notifies the admin with a result of the created count, no failures, and no reasons keyed by the row id', async () => {
            await useCase.execute('outbox-bramble', payload);

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.userImportResult,
                {
                    userId: 'admin-bramble',
                    proceedBy: 'admin-bramble',
                    reference: 'outbox-bramble',
                    created: 1,
                    failed: 0,
                    reasons: [],
                }
            );
        });

        it('acts for the payload actor and records the payload activity log', async () => {
            const response = await useCase.execute('outbox-bramble', payload);

            expect(response.created).toBe(1);
            expect(userImportService.prepareImportByAdmin).toHaveBeenCalledWith(
                rows,
                payload.activityLog.actorUserId,
                role,
                'country-bramble'
            );
            expect(
                activityLogQueue.recordEffectFromPayload
            ).toHaveBeenCalledWith(payload.activityLog, stageInput);
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute('outbox-bramble', payload)
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
                useCase.execute('outbox-bramble', payload)
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(
                userImportService.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('adds the result effect alone with one username reason and resolves when a username collides', async () => {
            databaseService.withTransaction.mockRejectedValueOnce(
                buildPrismaKnownRequestError('P2002', 'username')
            );

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).resolves.toEqual({
                message: 'user.queue.importByAdmin',
                created: 0,
                failed: 1,
            });

            expect(messageService.setMessage).toHaveBeenCalledWith(
                'user.error.usernameExist'
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.userImportResult,
                {
                    userId: 'admin-bramble',
                    proceedBy: 'admin-bramble',
                    reference: 'outbox-bramble',
                    created: 0,
                    failed: 1,
                    reasons: ['user.error.usernameExist'],
                }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(outboxService.addInTx).toHaveBeenCalledTimes(1);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                resultEffect
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
        });

        it('adds the result effect alone with one email reason and resolves when an email collides', async () => {
            databaseService.withTransaction.mockRejectedValueOnce(
                buildPrismaKnownRequestError('P2002', 'email')
            );

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).resolves.toEqual({
                message: 'user.queue.importByAdmin',
                created: 0,
                failed: 1,
            });

            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.userImportResult,
                expect.objectContaining({
                    created: 0,
                    failed: 1,
                    reasons: ['user.error.emailExist'],
                })
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(outboxService.addInTx).toHaveBeenCalledWith(
                tx,
                resultEffect
            );
        });

        it('retries with the next slug attempt after a slug collision', async () => {
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx));

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).resolves.toMatchObject({ created: 1, failed: 0 });

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenLastCalledWith(tx, [{ ...owned, slug: 'w-bramble-b' }]);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws DatabaseUniqueValueGenerationFailedException after the last slug attempt and adds no result', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'slug')
            );

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('throws a QueueException wrapping an unmapped error and adds no result', async () => {
            const unexpected = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(unexpected);

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).rejects.toMatchObject({
                constructor: QueueException,
                message: 'user.queue.error.importFailed',
                isFatal: true,
                rawError: unexpected,
            });
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });

        it('rethrows a mapped exception that is not a collision and adds no result', async () => {
            const notCollision = new WorkspaceNotFoundException();
            databaseService.withTransaction.mockRejectedValue(notCollision);

            await expect(
                useCase.execute('outbox-bramble', payload)
            ).rejects.toBe(notCollision);
            expect(outboxService.addInTx).not.toHaveBeenCalled();
        });
    });
});
