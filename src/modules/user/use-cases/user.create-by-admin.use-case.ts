import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
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
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
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
export class UserCreateByAdminUseCase implements IAppUseCase<
    [UserCreateRequestDto, IUser],
    IResponseReturn<DatabaseIdResponseDto>
> {
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userService: UserService,
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
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
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
        { countryId, email, name, roleId, username }: UserCreateRequestDto,
        actor: IUser
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        // Sequential by design: gate before the work it guards
        const role = await this.roleService.getById(roleId);
        this.roleService.assertActorOutranks(actor.role.type, role.type);

        const [emailExist, usernameCheck] = await Promise.all([
            this.userService.existsByEmail(email),
            this.userService.checkUsername(username),
            this.countryService.getOne(countryId),
        ]);
        this.userService.assertEmailAvailable(emailExist);
        this.userService.assertUsernameAvailable(usernameCheck);

        const { input, passwordString } =
            await this.userService.prepareCreateByAdmin(
                { countryId, email, name: name ?? null, roleId, username },
                actor.id,
                role
            );
        const users = await this.createAdminUsers(
            [input],
            this.createTimeoutInMs
        );
        const created = users[0]!;

        const stages = this.userCreateUtil.buildCreateByAdminStages(
            input,
            created
        );
        this.stageActivities(stages);

        if (input.password) {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                input.password.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                input.password.passwordExpired
            );
            const recipient = this.notificationUtil.mapRecipient(
                created,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            await this.notificationQueue.sendWelcomeByAdmin(
                recipient,
                {
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                },
                actor.id
            );
        }

        return { data: { id: created.id } };
    }
}
