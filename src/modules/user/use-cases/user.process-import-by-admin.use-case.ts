import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import { QueueUnrecoverableException } from '@common/queue/exceptions/queue.unrecoverable.exception';
import type { IUserImportByAdminQueueResponse } from '@modules/user/interfaces/user.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { CountryService } from '@modules/country/services/country.service';
import {
    EnumNotificationKind,
    EnumNotificationProcessResultStatus,
} from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { UserImportEncryptionPurpose } from '@modules/user/constants/user.constant';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUserCreateWithWorkspaceInput,
    IUserImportByAdminEncryptedPayload,
} from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserService } from '@modules/user/services/user.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProcessImportByAdminUseCase implements IAppUseCase<
    [string, IUserImportByAdminEncryptedPayload],
    IUserImportByAdminQueueResponse
> {
    private readonly defaultRole: string;
    private readonly defaultCountry: string;
    private readonly createBulkTimeoutInMs: number;
    private readonly encryptionSecret: string;

    constructor(
        private readonly userImportService: UserImportService,
        private readonly userService: UserService,
        private readonly mfaService: MfaService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly workspaceService: WorkspaceService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.defaultCountry = this.configService.get<string>(
            'user.default.country'
        )!;
        this.createBulkTimeoutInMs = this.configService.get<number>(
            'user.createBulkTimeoutInMs'
        )!;
        this.encryptionSecret = this.configService.get<string>(
            'app.encryptionSecret'
        )!;
    }

    private async createAdminUsers(
        payload: IUserImportByAdminEncryptedPayload,
        inputs: IUserCreateWithWorkspaceInput[],
        welcomes: IOutboxEffect[],
        outboxId: string
    ): Promise<UserUsernameExistException | UserEmailExistException | null> {
        const { activityLog } = payload;
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const userIds = inputs.map(({ userId }) => userId);
        const title = this.messageService.setMessage(
            'user.processResult.importByAdmin.success.title'
        );
        const description = this.messageService.setMessage(
            'user.processResult.importByAdmin.success.description',
            { properties: { created: inputs.length } }
        );

        let collision: WorkspaceSlugAlreadyExistsException | null = null;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                await this.databaseService.withTransaction(
                    async tx => {
                        await this.userService.createManyInTx(tx, inputs);
                        await Promise.all([
                            this.mfaService.createManyInTx(tx, inputs),
                            this.passwordHistoryService.createManyInTx(
                                tx,
                                passwordHistories
                            ),
                            this.notificationService.createDefaultsManyInTx(
                                tx,
                                userIds,
                                activityLog.actorUserId
                            ),
                        ]);

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceService.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );
                        const stages =
                            this.userImportService.buildImportByAdminStages(
                                inputs
                            );
                        const entries = stages.map(stage =>
                            this.activityLogQueue.recordEffectFromPayload(
                                activityLog,
                                stage
                            )
                        );
                        const result = this.notificationQueue.notify(
                            EnumNotificationKind.processResult,
                            {
                                userId: activityLog.actorUserId,
                                proceedBy: activityLog.actorUserId,
                                reference: outboxId,
                                status: EnumNotificationProcessResultStatus.success,
                                title,
                                description,
                                link: null,
                                linkExpiredAt: null,
                            }
                        );
                        await Promise.all([
                            this.outboxService.addManyInTx(tx, [
                                ...entries,
                                ...welcomes,
                                result,
                            ]),
                            this.outboxService.replaceDataInTx(tx, outboxId, {
                                ...payload,
                                created: inputs.length,
                            }),
                        ]);
                    },
                    { timeout: this.createBulkTimeoutInMs }
                );

                return null;
            } catch (error: unknown) {
                if (error instanceof WorkspaceSlugAlreadyExistsException) {
                    collision = error;
                    continue;
                }

                if (
                    error instanceof UserUsernameExistException ||
                    error instanceof UserEmailExistException
                ) {
                    return error;
                }

                if (error instanceof AppBaseException) {
                    throw error;
                }

                const message = this.messageService.setMessage(
                    'user.queue.error.importFailed'
                );

                throw new QueueException(message, true, error);
            }
        }

        throw new AppUnknownException(collision);
    }

    async execute(
        outboxId: string,
        payload: IUserImportByAdminEncryptedPayload
    ): Promise<IUserImportByAdminQueueResponse> {
        const { rows, activityLog, created: recorded } = payload;
        if (recorded !== null) {
            const message = this.messageService.setMessage(
                'user.queue.importByAdmin'
            );

            return { message, created: recorded };
        }

        const { actorUserId } = activityLog;
        const opened = rows.map(({ encryptedEmail, ...row }) => {
            const email = this.helperEncryptionService.aes256Decrypt(
                encryptedEmail,
                this.encryptionSecret,
                UserImportEncryptionPurpose,
                actorUserId
            );

            return { ...row, email };
        });
        // Sequential by design: a cheap check before the expensive or external work it guards
        const [role, countryId] = await Promise.all([
            this.roleService.getByName(this.defaultRole),
            this.countryService.getIdByAlpha2Code(this.defaultCountry),
        ]);
        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportService.prepareImportByAdmin(
                opened,
                actorUserId,
                role,
                countryId
            );
        const welcomes = inputs.map((input, index) => {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordExpired
            );

            return this.notificationQueue.notify(
                EnumNotificationKind.welcomeByAdmin,
                {
                    userId: input.userId,
                    proceedBy: actorUserId,
                    password: passwordStrings[index]!,
                    passwordCreatedAt,
                    passwordExpiredAt,
                }
            );
        });

        const collision = await this.createAdminUsers(
            payload,
            inputs,
            welcomes,
            outboxId
        );
        if (collision === null) {
            const message = this.messageService.setMessage(
                'user.queue.importByAdmin'
            );

            return { message, created: inputs.length };
        }

        const reason = this.messageService.setMessage(collision.messagePath);
        const title = this.messageService.setMessage(
            'user.processResult.importByAdmin.error.title'
        );
        const description = this.messageService.setMessage(
            'user.processResult.importByAdmin.error.description',
            { properties: { reason } }
        );
        const result = this.notificationQueue.notify(
            EnumNotificationKind.processResult,
            {
                userId: actorUserId,
                proceedBy: actorUserId,
                reference: outboxId,
                status: EnumNotificationProcessResultStatus.error,
                title,
                description,
                link: null,
                linkExpiredAt: null,
            }
        );
        await this.databaseService.withTransaction(async tx =>
            this.outboxService.addInTx(tx, result)
        );
        const conflict = this.messageService.setMessage(
            'user.queue.error.importConflict',
            { properties: { reason } }
        );

        throw new QueueUnrecoverableException(conflict, false, collision);
    }
}
