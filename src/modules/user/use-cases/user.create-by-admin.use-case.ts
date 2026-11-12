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
import type { IOutboxEffect } from '@modules/outbox/interfaces/outbox.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserCreateByAdminUseCase implements IAppUseCase<
    [UserCreateRequestDto, IUser, IRequestContext],
    IResponseReturn<DatabaseIdResponseDto>
> {
    private readonly createTimeoutInMs: number;

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
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
    }

    private async createAdminUsers(
        inputs: IUserCreateWithWorkspaceInput[],
        effects: IOutboxEffect[],
        timeoutInMs: number,
        context: IRequestContext
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
                                    stage,
                                    context
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
        { countryId, email, name, roleId, username }: UserCreateRequestDto,
        actor: IUser,
        context: IRequestContext
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
        const effects: IOutboxEffect[] = [];
        if (input.password) {
            const passwordCreatedAt = this.helperDateService.formatToIso(
                input.password.passwordCreated
            );
            const passwordExpiredAt = this.helperDateService.formatToIso(
                input.password.passwordExpired
            );
            const welcome = this.notificationService.notify(
                EnumNotificationKind.welcomeByAdmin,
                {
                    userId: input.userId,
                    proceedBy: actor.id,
                    password: passwordString,
                    passwordCreatedAt,
                    passwordExpiredAt,
                }
            );
            effects.push(welcome);
        }

        const users = await this.createAdminUsers(
            [input],
            effects,
            this.createTimeoutInMs,
            context
        );
        const created = users[0]!;

        return { data: { id: created.id } };
    }
}
