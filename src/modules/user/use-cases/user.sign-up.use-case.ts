import { EnumRoleScope } from '@generated/prisma-client/client';
import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUserCreateWithWorkspaceInput,
    IUserSignUp,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserSignUpUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserSignUpRequestDto],
    IResponseReturn<void>
> {
    private readonly appName: string;
    private readonly defaultRole: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userService: UserService,
        private readonly authPasswordService: AuthPasswordService,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly notificationService: NotificationService,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
    }

    private async createSignUpUser(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        input: IUserCreateWithWorkspaceInput,
        emailVerification: IUserVerificationEmailCreate
    ): Promise<void> {
        const inputs = [input];
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const workspaceContext = input.workspaceContext;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                await this.outboxService.withTransaction(
                    async tx => {
                        await this.termPolicyAcceptanceService.assertRequiredPublishedInTx(
                            tx,
                            UserTermPolicyContract.requiredTypes
                        );

                        const created =
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
                                workspaceContext.projectMemberRoleId
                            ) {
                                await this.projectMemberService.createInTx(
                                    tx,
                                    workspaceContext.projectId,
                                    input.userId,
                                    workspaceContext.projectMemberRoleId,
                                    input.userId
                                );
                            }
                        }

                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );

                        const welcome = this.notificationService.notify(
                            EnumNotificationKind.welcome,
                            { userId: input.userId, proceedBy: input.userId }
                        );
                        const verificationContext =
                            this.userVerificationUtil.mapEmailContext(
                                input.userId,
                                emailVerification
                            );
                        const verification = this.notificationService.notify(
                            EnumNotificationKind.verificationEmail,
                            verificationContext
                        );
                        const stages = this.userCreateUtil.buildStages(
                            UserCreateContract.signUp,
                            inputs,
                            created
                        );
                        const entries = stages.map(stage =>
                            this.activityLogService.recordEffect(
                                requestContext,
                                apiKeyContext,
                                null,
                                null,
                                stage
                            )
                        );
                        await this.outboxService.addManyInTx(tx, [
                            ...entries,
                            welcome,
                            verification,
                        ]);
                    },
                    { timeout: this.createTimeoutInMs }
                );

                return;
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
        {
            countryId,
            email,
            username,
            password,
            inviteToken,
            name,
            from,
            cookies,
            marketing,
        }: UserSignUpRequestDto
    ): Promise<IResponseReturn<void>> {
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
        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            signUp.email,
            signUp.username,
            signUp.name
        );
        const [role, emailExist, usernameCheck] = await Promise.all([
            this.roleService.getRefByScopeAndKey(
                EnumRoleScope.platform,
                this.defaultRole
            ),
            this.userService.existsByEmail(signUp.email),
            this.userService.checkUsername(signUp.username),
            this.countryService.getOne(signUp.countryId),
            this.authPasswordService.assertAllowed(
                signUp.password,
                contextWords
            ),
        ]);
        this.userService.assertEmailAvailable(emailExist);
        this.userService.assertUsernameAvailable(usernameCheck);

        const { input, emailVerification } =
            await this.userRegistrationService.prepareSignUp(signUp, {
                roleId: role.id,
                workspaceContext,
            });
        await this.createSignUpUser(
            requestContext,
            apiKeyContext,
            input,
            emailVerification
        );

        return {};
    }
}
