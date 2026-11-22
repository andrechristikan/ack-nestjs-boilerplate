import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumMfaChallengePurpose,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import type { IAuthSocialContext } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationService } from '@modules/notification/services/notification.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserAuthOutcome,
    IUserLoginSocial,
} from '@modules/user/interfaces/user.interface';
import type { IUserAuthSignUp } from '@modules/user/interfaces/user.auth.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceInviteAlreadyProcessedException } from '@modules/workspace/exceptions/workspace.invite-already-processed.exception';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
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
    IResponseReturn<IUserAuthOutcome>
> {
    private readonly defaultRole: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userService: UserService,
        private readonly mfaService: MfaService,
        private readonly mfaPasskeyService: MfaPasskeyService,
        private readonly mfaChallengeService: MfaChallengeService,
        private readonly userSocialService: UserSocialService,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly notificationQueue: NotificationQueue,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly activityLogQueue: ActivityLogQueue,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userUtil: UserUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly deviceService: DeviceService,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
        private readonly outboxService: OutboxService,
        private readonly databaseUtil: DatabaseUtil,
        private readonly helperDateService: HelperDateService,
        private readonly configService: ConfigService
    ) {
        this.defaultRole = this.configService.get<string>('user.default.role')!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.createTimeoutInMs'
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
    ): Promise<IUserAuthSignUp> {
        const [invite, role, usernameCheck] = await Promise.all([
            this.workspaceInviteService.getSignUpInvite(
                loginSocial.inviteToken,
                normalizedEmail
            ),
            this.roleService.getByName(this.defaultRole),
            this.userService.checkUsername(loginSocial.username),
            this.countryService.getOne(loginSocial.countryId),
            this.termPolicyAcceptanceService.assertRequiredPublished(
                UserTermPolicyContract.requiredTypes
            ),
        ]);
        const workspaceContext =
            this.userCreateUtil.buildSignUpWorkspaceContext(
                invite,
                loginSocial.username
            );
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
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const userIds = inputs.map(({ userId }) => userId);

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                return await this.databaseService.withTransaction(
                    async tx => {
                        const created = await this.userService.createManyInTx(
                            tx,
                            inputs
                        );
                        await Promise.all([
                            ...inputs.map(({ userId, createdBy }) =>
                                this.mfaService.createInTx(
                                    tx,
                                    userId,
                                    createdBy
                                )
                            ),
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
                            inputContext.type ===
                            EnumUserCreateWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteService.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                inputContext
                            );
                        }

                        await this.termPolicyAcceptanceService.acceptPublishedManyInTx(
                            tx,
                            termPolicyAcceptances
                        );
                        let membership: Promise<IProjectMember | null> =
                            Promise.resolve(null);
                        if (
                            inputContext.type ===
                                EnumUserCreateWorkspaceContextType.invite &&
                            inputContext.projectId &&
                            inputContext.projectMemberRole
                        ) {
                            membership = this.projectMemberService.createInTx(
                                tx,
                                inputContext.projectId,
                                input.userId,
                                inputContext.projectMemberRole,
                                input.userId
                            );
                        }
                        await Promise.all([
                            this.userSocialService.linkInTx(
                                tx,
                                input.userId,
                                loginWith,
                                subject,
                                input.userId
                            ),
                            membership,
                        ]);

                        const welcome = this.notificationQueue.notify(
                            EnumNotificationKind.welcomeSocial,
                            { userId: input.userId, proceedBy: input.userId }
                        );
                        const stages = this.userCreateUtil.buildStages(
                            UserCreateContract.social,
                            inputs,
                            created
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
                            welcome,
                            ...entries,
                        ]);

                        const user = created[0]!;
                        const upserted =
                            await this.deviceService.upsertForLoginInTx(
                                tx,
                                user.id,
                                loginSocial.device,
                                loginAt
                            );
                        const { tokens } =
                            await this.userAuthService.createTokenAndSessionInTx(
                                tx,
                                requestContext,
                                apiKeyContext,
                                user,
                                upserted,
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

                const exception = this.databaseUtil.toException(error);
                const isInviteConflict =
                    inputContext.type ===
                        EnumUserCreateWorkspaceContextType.invite &&
                    exception instanceof DatabaseWriteConflictException;
                if (isInviteConflict) {
                    throw new WorkspaceInviteAlreadyProcessedException();
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
    ): Promise<IUserAuthOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: a write after its checks
        const [lastWorkspaceId, isMfaEnabled] = await Promise.all([
            this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            ),
            this.mfaService.isEnabled(user.id),
        ]);
        const isUnverified = this.userUtil.isUnverified(user);
        let methods: EnumMfaMethod[] = [];
        let passkeyOptions: PublicKeyCredentialRequestOptionsJSON | null = null;
        if (isMfaEnabled) {
            const credentials =
                await this.mfaPasskeyService.getCredentialsByUser(user.id);
            methods = await this.mfaService.getLoginMethods(
                user.id,
                credentials
            );
            if (methods.includes(EnumMfaMethod.passkey)) {
                passkeyOptions =
                    await this.mfaPasskeyService.getAssertionOptions(
                        credentials
                    );
            }
        }

        return this.databaseService.withTransaction(
            async (tx): Promise<IUserAuthOutcome> => {
                let verifying = Promise.resolve(user);
                if (isUnverified) {
                    verifying = this.userAuthService.verifyEmailBySocialInTx(
                        tx,
                        requestContext,
                        apiKeyContext,
                        user
                    );
                }
                let linking = Promise.resolve();
                if (subject !== null) {
                    linking = this.userSocialService.linkInTx(
                        tx,
                        user.id,
                        loginWith,
                        subject,
                        user.id
                    );
                }
                const [loginUser] = await Promise.all([verifying, linking]);
                if (!isMfaEnabled) {
                    const upserted =
                        await this.deviceService.upsertForLoginInTx(
                            tx,
                            loginUser.id,
                            device,
                            loginAt
                        );
                    const { tokens } =
                        await this.userAuthService.createTokenAndSessionInTx(
                            tx,
                            requestContext,
                            apiKeyContext,
                            loginUser,
                            upserted,
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

                const challenge = await this.mfaChallengeService.createInTx(
                    tx,
                    {
                        purpose: EnumMfaChallengePurpose.login,
                        userId: user.id,
                        device,
                        loginFrom,
                        loginWith,
                        webAuthnChallenge: passkeyOptions?.challenge ?? null,
                    }
                );

                return {
                    isMfaRequired: true,
                    lastWorkspaceId,
                    lastWorkspaceChangedAt,
                    mfa: { ...challenge, methods, passkeyOptions },
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
    ): Promise<IResponseReturn<IUserAuthOutcome>> {
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
        // Sequential by design: a write after its checks
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

        const normalizedEmail = this.userUtil.normalizeEmail(authContext.email);
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
