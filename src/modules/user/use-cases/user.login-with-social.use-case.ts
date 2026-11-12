import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import type { IUserCreated } from '@modules/user/interfaces/user.create.interface';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginSocial,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserLoginWithSocialUseCase implements IAppUseCase<
    [string, EnumUserLoginWith, UserCreateSocialRequestDto],
    IResponseReturn<IUserLoginOutcome>
> {
    private readonly userRoleName: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userAuthService: UserAuthService,
        private readonly userService: UserService,
        private readonly userRegistrationService: UserRegistrationService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly sessionService: SessionService,
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
        this.userRoleName =
            this.configService.get<string>('user.default.role')!;
        this.createTimeoutInMs = this.configService.get<number>(
            'user.create.timeoutInMs'
        )!;
    }

    private async signUpWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        loginSocial: IUserLoginSocial
    ): Promise<IUserCreated | null> {
        const normalizedEmail = email.trim().toLowerCase();
        // Sequential by design: gate before the work it guards
        const isAllowed =
            await this.userRegistrationService.isSocialSignUpAllowed(
                normalizedEmail,
                loginWith
            );
        if (!isAllowed) {
            return null;
        }

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
            this.roleService.getByName(this.userRoleName),
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
                const users = await this.outboxService.withTransaction(
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
                                inputContext.projectMemberRole
                            ) {
                                await this.projectMemberService.createInTx(
                                    tx,
                                    inputContext.projectId,
                                    input.userId,
                                    inputContext.projectMemberRole,
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
                        await this.outboxService.addInTx(tx, welcome);

                        return created;
                    },
                    { timeout: this.createTimeoutInMs }
                );

                return { inputs, users };
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

    private async startSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const session = await this.userAuthService.createTokenAndSession(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        await this.sessionService.setLoginOrRevoke(
            user.id,
            session.sessionId,
            session.jti
        );

        if (session.revokeStages.length > 0) {
            const revokeLogs = session.revokeStages.map(stage =>
                this.activityLogService.prepare(stage)
            );

            this.activityLogService.stagePrepared(revokeLogs);
        }

        return session.tokens;
    }

    private async resolveLoginOutcome(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceChangedAt } = user;
        // Sequential by design: write must not run if an earlier step throws
        const lastWorkspaceId =
            await this.workspaceMemberService.resolveLastWorkspaceId(
                user.id,
                user.lastWorkspaceId
            );
        const isTwoFactorEnabled = this.userUtil.isTwoFactorEnabled(user);
        if (!isTwoFactorEnabled) {
            const tokens = await this.startSession(
                user,
                device,
                loginFrom,
                loginWith,
                loginAt
            );

            return {
                isTwoFactorEnable: false,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                tokens,
            };
        }

        const twoFactor = await this.userAuthService.createTwoFactorChallenge(
            user,
            device,
            loginFrom,
            loginWith
        );

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            twoFactor,
        };
    }

    private async completeLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginOutcome> {
        const loginAt = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const loginLogs = [
            this.activityLogService.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const outcome = await this.resolveLoginOutcome(
            user,
            device,
            loginFrom,
            loginWith,
            loginAt
        );
        if (!outcome.isTwoFactorEnable) {
            this.activityLogService.stagePrepared(loginLogs);
        } else if (outcome.twoFactor.isRequiredSetup) {
            const setupLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];

            this.activityLogService.stagePrepared(setupLogs);
        }

        return outcome;
    }

    async execute(
        email: string,
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
        const created = await this.signUpWithSocial(
            email,
            loginWith,
            loginSocial
        );
        if (created !== null) {
            const stages = this.userCreateUtil.buildStages(
                UserCreateContract.social,
                created.inputs,
                created.users
            );
            const createdLogs = stages.map(stage =>
                this.activityLogService.prepare(stage)
            );

            this.activityLogService.stagePrepared(createdLogs);
        }

        let user = await this.userAuthService.getOneForSocialLogin(email);
        const isUnverified = this.userUtil.isUnverified(user);
        if (isUnverified) {
            const verifiedLogs = [
                this.activityLogService.prepare({
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            user = await this.userAuthService.verifyEmailBySocial(user);

            this.activityLogService.stagePrepared(verifiedLogs);
        }

        // Sequential by design: write must not run if an earlier step throws
        const outcome = await this.completeLogin(
            user,
            deviceIdentity,
            from,
            loginWith
        );

        return { data: outcome };
    }
}
