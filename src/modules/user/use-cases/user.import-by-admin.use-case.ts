import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { EnumActivityLogAction } from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStageInput } from '@modules/activity-log/interfaces/activity-log.interface';
import { CountryService } from '@modules/country/services/country.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserService } from '@modules/user/services/user.service';
import { UserImportService } from '@modules/user/services/user.import.service';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserImportByAdminUseCase implements IAppUseCase<
    [UserImportRequestDto[], string],
    IResponseReturn<void>
> {
    private readonly userRoleName: string;
    private readonly userCountryName: string;
    private readonly createBulkTimeoutInMs: number;

    constructor(
        private readonly userService: UserService,
        private readonly userImportService: UserImportService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.userCountryName = this.configService.get<string>(
            'user.default.country'
        )!;
        this.createBulkTimeoutInMs = this.configService.get<number>(
            'user.create.bulkTimeoutInMs'
        )!;
    }

    private stageActivities(
        stages: IActivityLogStageInput<EnumActivityLogAction>[]
    ): void {
        const activityLogs = stages.map(stage =>
            this.activityLogService.prepare(stage)
        );

        this.activityLogService.stagePrepared(activityLogs);
    }

    private async createAdminUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        timeoutInMs: number
    ): Promise<IUser[]> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.databaseService.withTransaction(
                    async tx => {
                        const users = await this.userService.createManyInTx(
                            tx,
                            inputs
                        );
                        await this.passwordHistoryService.createManyInTx(
                            tx,
                            passwordHistories
                        );
                        await this.notificationService.createDefaultsManyInTx(
                            tx,
                            userIds
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

                        return users;
                    },
                    { timeout: timeoutInMs }
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
                if (mapped instanceof AppBaseException) {
                    throw mapped;
                }

                throw new AppUnknownException(mapped);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async execute(
        data: UserImportRequestDto[],
        createdBy: string
    ): Promise<IResponseReturn<void>> {
        const rows = data.map(({ email, name, username }) => ({
            email,
            name: name ?? null,
            username,
        }));
        const emails = rows.map(item => item.email);
        const usernames = rows.map(item => item.username);
        const [existingEmails, usernameChecks] = await Promise.all([
            this.userImportService.getExistingEmails(emails),
            this.userImportService.getUsernameChecks(usernames),
        ]);
        this.userImportService.assertEmailsAvailable(existingEmails);

        const [role, countryId] = await Promise.all([
            this.roleService.getByName(this.userRoleName),
            this.countryService.getIdByAlpha2Code(this.userCountryName),
        ]);

        const { inputs, passwordHasheds, passwordStrings } =
            await this.userImportService.prepareImportByAdmin(
                rows,
                createdBy,
                role,
                countryId,
                usernameChecks
            );
        const users = await this.createAdminUsers(
            inputs,
            this.createBulkTimeoutInMs
        );
        const stages = this.userCreateUtil.buildImportByAdminStages(
            inputs,
            users
        );
        this.stageActivities(stages);

        const items = users.map((created, index) => {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                passwordHasheds[index]!.passwordExpired
            );
            const recipient = this.notificationUtil.mapRecipient(
                created,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );

            return {
                recipient,
                data: {
                    password: passwordStrings[index]!,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
            };
        });

        await this.notificationQueue.sendWelcomeByAdminBulk(items, createdBy);

        return {};
    }
}
