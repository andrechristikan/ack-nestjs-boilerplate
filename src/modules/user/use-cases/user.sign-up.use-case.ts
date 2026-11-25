import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import { AuthPasswordService } from '@modules/auth/services/auth.password.service';
import { AuthPasswordUtil } from '@modules/auth/utils/auth.password.util';
import { CountryService } from '@modules/country/services/country.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import type { ITermPolicyRef } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUserCreateWithWorkspaceInput,
    IUserRegistration,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceSlugAlreadyExistsException } from '@modules/workspace/exceptions/workspace.slug-already-exists.exception';
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
        private readonly mfaService: MfaService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly notificationQueue: NotificationQueue,
        private readonly authPasswordUtil: AuthPasswordUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userVerificationUtil: UserVerificationUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly configService: ConfigService
    ) {
        this.appName = this.configService.get<string>('app.name')!;
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.createTimeoutInMs'
        )!;
    }

    private async createSignUpUser(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        input: IUserCreateWithWorkspaceInput,
        emailVerification: IUserVerificationEmailCreate,
        termPolicyRefs: ITermPolicyRef[]
    ): Promise<void> {
        const inputs = [input];
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const userIds = inputs.map(({ userId }) => userId);
        const workspaceContext = input.workspaceContext;

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
                                input.userId
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

                        if (
                            workspaceContext.type ===
                            EnumUserCreateWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteService.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                workspaceContext
                            );
                        }

                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyRefs,
                            termPolicyAcceptances
                        );
                        if (
                            workspaceContext.type ===
                                EnumUserCreateWorkspaceContextType.invite &&
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

                        const welcome = this.notificationQueue.notify(
                            EnumNotificationKind.welcome,
                            { userId: input.userId, proceedBy: input.userId }
                        );
                        const verificationContext =
                            this.userVerificationUtil.mapEmailContext(
                                input.userId,
                                emailVerification
                            );
                        const verification = this.notificationQueue.notify(
                            EnumNotificationKind.verificationEmail,
                            verificationContext
                        );
                        const stages = this.userCreateUtil.buildStages(
                            UserCreateContract.signUp,
                            inputs
                        );
                        const entries = stages.map(stage =>
                            this.activityLogQueue.recordEffect(
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
        this.userService.assertEmailDeliverable();

        const signUp: IUserRegistration = {
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
        const contextWords = this.authPasswordUtil.createContextWords(
            this.appName,
            signUp.email,
            signUp.username,
            signUp.name
        );
        const acceptedTermPolicyTypes =
            this.userCreateUtil.buildAcceptedTermPolicyTypes(
                signUp.cookies,
                signUp.marketing
            );
        const [invite, role, emailExist, usernameCheck, termPolicyRefs] =
            await Promise.all([
                this.workspaceInviteService.getSignUpInvite(
                    signUp.inviteToken,
                    signUp.email
                ),
                this.roleService.getByName(this.defaultRole),
                this.userService.existsByEmail(signUp.email),
                this.userService.checkUsername(signUp.username),
                this.termPolicyAcceptanceService.getPublishedForAcceptance(
                    UserTermPolicyContract.requiredTypes,
                    acceptedTermPolicyTypes
                ),
                this.countryService.getOne(signUp.countryId),
                this.authPasswordService.assertAllowed(
                    signUp.password,
                    contextWords
                ),
            ]);
        const workspaceContext =
            this.userCreateUtil.buildSignUpWorkspaceContext(
                invite,
                signUp.username
            );
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
            emailVerification,
            termPolicyRefs
        );

        return {};
    }
}
