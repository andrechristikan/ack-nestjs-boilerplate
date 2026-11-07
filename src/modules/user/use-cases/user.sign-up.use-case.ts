import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
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
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserSignUp,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserSignUpUseCase implements IAppUseCase<
    [UserSignUpRequestDto],
    IResponseReturn<void>
> {
    private readonly userRoleName: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userService: UserService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
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

    private async createSignUpUser(
        input: IUserCreateWithWorkspaceInput
    ): Promise<IUser> {
        const inputs = [input];
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);
        const workspaceContext = input.workspaceContext;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const users = await this.databaseService.withTransaction(
                    async tx => {
                        // Sequential by design: gate before the work it guards
                        await this.termPolicyAcceptanceService.assertRequiredPublishedInTx(
                            tx,
                            UserTermPolicyContract.requiredTypes
                        );

                        const created = await this.userService.createManyInTx(
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

                        if (
                            workspaceContext.type ===
                            EnumUserSignUpWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteService.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                workspaceContext
                            );
                            if (
                                workspaceContext.projectId &&
                                workspaceContext.projectMemberRole
                            ) {
                                await this.projectMemberService.createInTx(
                                    tx,
                                    workspaceContext.projectId,
                                    input.userId,
                                    workspaceContext.projectMemberRole,
                                    input.userId
                                );
                            }
                        }

                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );

                        return created;
                    },
                    { timeout: this.createTimeoutInMs }
                );

                return users[0]!;
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

    async execute({
        countryId,
        email,
        username,
        password,
        inviteToken,
        name,
        from,
        cookies,
        marketing,
    }: UserSignUpRequestDto): Promise<IResponseReturn<void>> {
        const signUp: IUserSignUp = {
            countryId,
            email,
            username,
            password,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            from,
            cookies,
            marketing,
        };
        // Sequential by design: gate before the work it guards
        const invite = await this.workspaceInviteService.getSignUpInvite(
            signUp.inviteToken,
            signUp.email
        );
        const workspaceContext =
            this.userCreateUtil.buildSignUpWorkspaceContext(
                invite,
                signUp.username
            );
        const [role, emailExist, usernameCheck] = await Promise.all([
            this.roleService.getByName(this.userRoleName),
            this.userService.existsByEmail(signUp.email),
            this.userService.checkUsername(signUp.username),
            this.countryService.getOne(signUp.countryId),
        ]);
        this.userService.assertEmailAvailable(emailExist);
        this.userService.assertUsernameAvailable(usernameCheck);

        const { input, emailVerification } =
            await this.userAuthService.prepareSignUp(signUp, {
                roleId: role.id,
                workspaceContext,
            });
        const created = await this.createSignUpUser(input);
        const stages = this.userCreateUtil.buildStages(
            UserCreateContract.signUp,
            [input],
            [created]
        );
        this.stageActivities(stages);

        const recipient = this.notificationUtil.mapRecipient(
            created,
            EnumNotificationKind.welcome,
            [],
            []
        );
        const payload =
            this.userVerificationUtil.mapEmailPayload(emailVerification);
        await this.notificationQueue.sendWelcome(recipient, payload);

        return {};
    }
}
