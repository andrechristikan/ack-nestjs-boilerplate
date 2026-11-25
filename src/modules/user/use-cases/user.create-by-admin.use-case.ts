import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationService } from '@modules/notification/services/notification.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type {
    IUserContext,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserCreateByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserCreateRequestDto,
    ],
    IResponseReturn<DatabaseIdResponseDto>
> {
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userService: UserService,
        private readonly workspaceService: WorkspaceService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly mfaService: MfaService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.createTimeoutInMs = this.configService.get<number>(
            'user.createTimeoutInMs'
        )!;
    }

    private async createAdminUsers(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        inputs: IUserCreateWithWorkspaceInput[],
        effects: IOutboxEffect[],
        createTimeoutInMs: number
    ): Promise<void> {
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const userIds = inputs.map(({ userId }) => userId);

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
                                authContext.userId
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
                        const entries = inputs.flatMap(input => {
                            const stages =
                                this.userRegistrationService.buildCreateByAdminStages(
                                    input
                                );

                            return stages.map(stage =>
                                this.activityLogQueue.recordEffect(
                                    requestContext,
                                    apiKeyContext,
                                    authContext,
                                    null,
                                    stage
                                )
                            );
                        });
                        await this.outboxService.addManyInTx(tx, [
                            ...entries,
                            ...effects,
                        ]);
                    },
                    { timeout: createTimeoutInMs }
                );

                return;
            } catch (error: unknown) {
                if (error instanceof WorkspaceSlugAlreadyExistsException) {
                    continue;
                }

                if (error instanceof AppBaseException) {
                    throw error;
                }

                throw new AppUnknownException(error);
            }
        }

        throw new DatabaseUniqueValueGenerationFailedException();
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { countryId, email, name, roleId, username }: UserCreateRequestDto
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        this.userService.assertEmailDeliverable();

        const [role, emailExist, usernameCheck] = await Promise.all([
            this.roleService.getById(roleId),
            this.userService.existsByEmail(email),
            this.userService.checkUsername(username),
            this.countryService.getOne(countryId),
        ]);
        this.roleService.assertActorOutranks(
            userContext.user.role.type,
            role.type
        );
        this.userService.assertEmailAvailable(emailExist);
        this.userService.assertUsernameAvailable(usernameCheck);

        const { input, password, passwordString } =
            await this.userService.prepareCreateByAdmin(
                { countryId, email, name: name ?? null, roleId, username },
                authContext.userId,
                role
            );
        const passwordCreatedAt = this.helperDateService.formatToIso(
            password.passwordCreated
        );
        const passwordExpiredAt = this.helperDateService.formatToIso(
            password.passwordExpired
        );
        const welcome = this.notificationQueue.notify(
            EnumNotificationKind.welcomeByAdmin,
            {
                userId: input.userId,
                proceedBy: authContext.userId,
                password: passwordString,
                passwordCreatedAt,
                passwordExpiredAt,
            }
        );
        const effects: IOutboxEffect[] = [welcome];

        await this.createAdminUsers(
            requestContext,
            apiKeyContext,
            authContext,
            [input],
            effects,
            this.createTimeoutInMs
        );

        return { data: { id: input.userId } };
    }
}
