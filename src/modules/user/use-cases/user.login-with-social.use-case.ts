import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumRoleScope,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginSocial,
} from '@modules/user/interfaces/user.interface';
import type { IUserLoginSignUp } from '@modules/user/interfaces/user.login.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserLoginWithSocialUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthSocialContext,
        EnumUserLoginWith,
        UserCreateSocialRequestDto,
    ],
    IResponseReturn<IUserLoginOutcome>
> {
    private readonly defaultRole: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userService: UserService,
        private readonly mfaService: MfaService,
        private readonly userSocialService: UserSocialService,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogService: ActivityLogService,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userUtil: UserUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly deviceUtil: DeviceUtil,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
    }

    private async signUpWithSocial(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        normalizedEmail: string,
        loginWith: EnumUserLoginWith,
        loginSocial: IUserLoginSocial,
        loginAt: Date,
        subject: string
    ): Promise<IUserLoginSignUp> {
        const invite = await this.workspaceInviteService.getSignUpInvite(
            loginSocial.inviteToken,
            normalizedEmail
        );
        const workspaceContext =
            this.userCreateUtil.buildSignUpWorkspaceContext(
                invite,
                loginSocial.username
            );
        const [role, usernameCheck] = await Promise.all([
            this.roleService.getRefByScopeAndKey(
                EnumRoleScope.platform,
                this.defaultRole
            ),
            this.userService.checkUsername(loginSocial.username),
            this.countryService.getOne(loginSocial.countryId),
        ]);
        this.userService.assertUsernameAvailable(usernameCheck);

        const input = this.userRegistrationService.buildSocialCreate(
            normalizedEmail,
            loginWith,
            loginSocial,
            { roleId: role.id, workspaceContext }
        );
        const inputs = [input];
        const inputContext = input.workspaceContext;
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.outboxService.withTransaction(
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
                        await this.userSocialService.linkInTx(
                            tx,
                            input.userId,
                            loginWith,
                            subject
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
                            inputContext.type ===
                            EnumUserSignUpWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteService.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                inputContext
                            );
                            if (
                                inputContext.projectId &&
                                inputContext.projectMemberRoleId
                            ) {
                                await this.projectMemberService.createInTx(
                                    tx,
                                    inputContext.projectId,
                                    input.userId,
                                    inputContext.projectMemberRoleId,
                                    input.userId
                                );
                            }
                        }

                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );

                        const welcome = this.notificationService.notify(
                            EnumNotificationKind.welcomeSocial,
                            { userId: input.userId, proceedBy: input.userId }
                        );
                        const stages = this.userCreateUtil.buildStages(
                            UserCreateContract.social,
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
                            welcome,
                            ...entries,
                        ]);

                        const user = created[0]!;
                        const { tokens } =
                            await this.userAuthService.createTokenAndSessionInTx(
                                tx,
                                requestContext,
                                apiKeyContext,
                                user,
                                loginSocial.device,
                                loginSocial.from,
                                loginWith,
                                loginAt
                            );

                        return { user, tokens };
                    },
                    { timeout: this.createTimeoutInMs }
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

    private async resolveLoginOutcome(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date,
        subject: string | null
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: write must not run if an earlier step throws
        const [lastWorkspaceId, isMfaEnabled] = await Promise.all([
            this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            ),
            this.mfaService.isEnabled(user.id),
        ]);
        const isUnverified = this.userUtil.isUnverified(user);

        return this.outboxService.withTransaction(
            async (tx): Promise<IUserLoginOutcome> => {
                if (subject !== null) {
                    await this.userSocialService.linkInTx(
                        tx,
                        user.id,
                        loginWith,
                        subject
                    );
                }
                let loginUser = user;
                if (isUnverified) {
                    loginUser =
                        await this.userAuthService.verifyEmailBySocialInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            user
                        );
                }
                if (!isMfaEnabled) {
                    const { tokens } =
                        await this.userAuthService.createTokenAndSessionInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            loginUser,
                            device,
                            loginFrom,
                            loginWith,
                            loginAt
                        );

                    return {
                        isMfaRequired: false,
                        lastWorkspaceId,
                        lastWorkspaceChangedAt,
                        tokens,
                    };
                }

                const mfa = await this.userAuthService.createMfaChallengeInTx(
                    tx,
                    user.id,
                    device,
                    loginFrom,
                    loginWith
                );

                return {
                    isMfaRequired: true,
                    lastWorkspaceId,
                    lastWorkspaceChangedAt,
                    mfa,
                };
            }
        );
    }

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthSocialContext,
        loginWith: EnumUserLoginWith,
        {
            from,
            device,
            username,
            inviteToken,
            name,
            countryId,
            cookies,
            marketing,
        }: UserCreateSocialRequestDto
    ): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.deviceUtil.toIdentity(device);
        const loginSocial: IUserLoginSocial = {
            from,
            device: deviceIdentity,
            username,
            inviteToken: inviteToken ?? null,
            name: name ?? null,
            countryId,
            cookies,
            marketing,
        };
        const loginAt = this.helperDateService.create();
        // Sequential by design: gate before the work it guards
        const linkedUserId = await this.userSocialService.getUserIdBySubject(
            loginWith,
            authContext.subject
        );
        if (linkedUserId !== null) {
            const linkedUser =
                await this.userAuthService.getOneForSocialLoginById(
                    linkedUserId
                );
            const outcome = await this.resolveLoginOutcome(
                requestContext,
                apiKeyContext,
                linkedUser,
                deviceIdentity,
                from,
                loginWith,
                loginAt,
                null
            );

            return { data: outcome };
        }

        const normalizedEmail = authContext.email.trim().toLowerCase();
        const isSignUpAllowed =
            await this.userRegistrationService.isSocialSignUpAllowed(
                normalizedEmail,
                loginWith
            );
        if (isSignUpAllowed) {
            const { user, tokens } = await this.signUpWithSocial(
                requestContext,
                apiKeyContext,
                normalizedEmail,
                loginWith,
                loginSocial,
                loginAt,
                authContext.subject
            );
            const lastWorkspaceId =
                await this.workspaceMemberService.resolveLastWorkspaceId(
                    user.id,
                    user.lastWorkspaceId
                );

            return {
                data: {
                    isMfaRequired: false,
                    lastWorkspaceId,
                    lastWorkspaceChangedAt: user.lastWorkspaceChangedAt,
                    tokens,
                },
            };
        }

        const user = await this.userAuthService.getOneForSocialLogin(
            authContext.email
        );
        await this.userSocialService.assertLinkable(user.id, loginWith);
        const outcome = await this.resolveLoginOutcome(
            requestContext,
            apiKeyContext,
            user,
            deviceIdentity,
            from,
            loginWith,
            loginAt,
            authContext.subject
        );

        return { data: outcome };
    }
}
