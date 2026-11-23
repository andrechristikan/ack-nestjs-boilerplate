import { EnumRoleScope } from '@generated/prisma-client/client';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { MessageService } from '@common/message/services/message.service';
import { QueueException } from '@common/queue/exceptions/queue.exception';
import type { IUserImportByAdminQueueResponse } from '@modules/user/interfaces/user.interface';
import type { IActivityLogActorPayload } from '@modules/activity-log/interfaces/activity-log.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserImportByAdminPayload,
} from '@modules/user/interfaces/user.interface';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserProcessImportByAdminUseCase implements IAppUseCase<
    [string, IUserImportByAdminPayload],
    IUserImportByAdminQueueResponse
> {
    private readonly defaultRole: string;
    private readonly defaultCountry: string;
    private readonly createBulkTimeoutInMs: number;

    constructor(
        private readonly userImportService: UserImportService,
        private readonly workspaceService: WorkspaceService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly messageService: MessageService,
        private readonly configService: ConfigService
    ) {
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.defaultCountry = this.configService.get<string>(
            'user.default.country'
        )!;
        this.createBulkTimeoutInMs = this.configService.get<number>(
            'user.create.bulkTimeoutInMs'
        )!;
    }

    private async createAdminUsers(
        activityLog: IActivityLogActorPayload,
        inputs: IUserCreateWithWorkspaceInput[],
        welcomes: IOutboxEffect[],
        outboxId: string
    ): Promise<IUser[] | UserUsernameExistException | UserEmailExistException> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.outboxService.withTransaction(
                    async tx => {
                        const users =
                            await this.userRegistrationService.createInTx(
                                tx,
                                inputs
                            );

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceService.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );
                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );
                        const stages =
                            this.userImportService.buildImportByAdminStages(
                                inputs,
                                users
                            );
                        const entries = stages.map(stage =>
                            this.activityLogService.recordEffectFromPayload(
                                activityLog,
                                stage
                            )
                        );
                        const result = this.notificationService.notify(
                            EnumNotificationKind.userImportResult,
                            {
                                userId: activityLog.actorUserId,
                                proceedBy: activityLog.actorUserId,
                                reference: outboxId,
                                created: users.length,
                                failed: 0,
                                reasons: [],
                            }
                        );
                        await this.outboxService.addManyInTx(tx, [
                            ...entries,
                            ...welcomes,
                            result,
                        ]);
                        await this.outboxService.updateDataInTx(tx, outboxId, {
                            created: users.length,
                        });

                        return users;
                    },
                    { timeout: this.createBulkTimeoutInMs }
                );
            } catch (error: unknown) {
                const isSlugCollision = this.databaseUtil.isUniqueCollision(
                    error,
                    'slug'
                );
                if (isSlugCollision) {
                    continue;
                }

                const mapped = this.userCreateUtil.mapCreateCollision(error);
                if (
                    mapped instanceof UserUsernameExistException ||
                    mapped instanceof UserEmailExistException
                ) {
                    return mapped;
                }

                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                const message = this.messageService.setMessage(
                    'user.queue.error.importFailed'
                );

                throw new QueueException(message, true, mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async execute(
        outboxId: string,
        { rows, activityLog, created: recorded }: IUserImportByAdminPayload
    ): Promise<IUserImportByAdminQueueResponse> {
        if (recorded !== null) {
            const message = this.messageService.setMessage(
                'user.queue.importByAdmin'
            );

            return { message, created: recorded, failed: 0 };
        }

        const { actorUserId } = activityLog;
        // Sequential by design: gate before the work it guards; write after the preparation
        const [role, countryId] = await Promise.all([
            this.roleService.getRefByScopeAndKey(
                EnumRoleScope.platform,
                this.defaultRole
            ),
            this.countryService.getIdByAlpha2Code(this.defaultCountry),
        ]);
        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportService.prepareImportByAdmin(
                rows,
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

            return this.notificationService.notify(
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

        const created = await this.createAdminUsers(
            activityLog,
            inputs,
            welcomes,
            outboxId
        );
        const message = this.messageService.setMessage(
            'user.queue.importByAdmin'
        );
        if (Array.isArray(created)) {
            return { message, created: created.length, failed: 0 };
        }

        const reason = this.messageService.setMessage(created.messagePath);
        const result = this.notificationService.notify(
            EnumNotificationKind.userImportResult,
            {
                userId: actorUserId,
                proceedBy: actorUserId,
                reference: outboxId,
                created: 0,
                failed: rows.length,
                reasons: [reason],
            }
        );
        await this.outboxService.add(result);

        return { message, created: 0, failed: rows.length };
    }
}
