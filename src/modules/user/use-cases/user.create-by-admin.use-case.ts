import { EnumRoleScope } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import type { DatabaseIdResponseDto } from '@common/database/dtos/response/database.id.response.dto';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import type { IOutboxEffect } from '@common/outbox/interfaces/outbox.interface';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type {
    IUser,
    IUserContext,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
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
    private readonly timeoutInMs: number;

    constructor(
        private readonly userService: UserService,
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
        private readonly configService: ConfigService
    ) {
        this.timeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
    }

    private async createAdminUsers(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        inputs: IUserCreateWithWorkspaceInput[],
        effects: IOutboxEffect[],
        timeoutInMs: number
    ): Promise<IUser[]> {
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
                        const entries = inputs.flatMap((input, index) => {
                            const stages =
                                this.userRegistrationService.buildCreateByAdminStages(
                                    input,
                                    users[index]!
                                );

                            return stages.map(stage =>
                                this.activityLogService.recordEffect(
                                    requestContext,
                                    apiKeyContext,
                                    null,
                                    null,
                                    stage
                                )
                            );
                        });
                        await this.outboxService.addManyInTx(tx, [
                            ...entries,
                            ...effects,
                        ]);

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
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        userContext: IUserContext,
        { countryId, email, name, roleId, username }: UserCreateRequestDto
    ): Promise<IResponseReturn<DatabaseIdResponseDto>> {
        // Sequential by design: gate before the work it guards
        const role = await this.roleService.getRefByIdForScope(
            roleId,
            EnumRoleScope.platform
        );
        this.roleService.assertActorOutranks(userContext.user.role.key, role);

        const [emailExist, usernameCheck] = await Promise.all([
            this.userService.existsByEmail(email),
            this.userService.checkUsername(username),
            this.countryService.getOne(countryId),
        ]);
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
        const welcome = this.notificationService.notify(
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

        const users = await this.createAdminUsers(
            requestContext,
            apiKeyContext,
            [input],
            effects,
            this.timeoutInMs
        );
        const created = users[0]!;

        return { data: { id: created.id } };
    }
}
