import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { AuthTwoFactorService } from '@modules/auth/services/auth.two-factor.service';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { CountryService } from '@modules/country/services/country.service';
import { DeviceService } from '@modules/device/services/device.service';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagService } from '@modules/feature-flag/services/feature-flag.service';
import { EnumFeatureFlagMetadataKey } from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { SessionService } from '@modules/session/services/session.service';
import type {
    ISessionPurgeLoginsPayload,
    ISessionRef,
} from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { SessionUtil } from '@modules/session/utils/session.util';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import { UserTwoFactorService } from '@modules/user/services/user.two-factor.service';
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
import { Duration } from 'luxon';
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
        private readonly userTwoFactorService: UserTwoFactorService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly notificationService: NotificationService,
        private readonly termPolicyAcceptanceService: TermPolicyAcceptanceService,
        private readonly workspaceService: WorkspaceService,
        private readonly workspaceInviteService: WorkspaceInviteService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly projectMemberService: ProjectMemberService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly featureFlagService: FeatureFlagService,
        private readonly deviceService: DeviceService,
        private readonly sessionService: SessionService,
        private readonly authJwtService: AuthJwtService,
        private readonly authTwoFactorService: AuthTwoFactorService,
        private readonly authUtil: AuthUtil,
        private readonly activityLogService: ActivityLogService,
        private readonly sessionQueue: SessionQueue,
        private readonly sessionUtil: SessionUtil,
        private readonly notificationQueue: NotificationQueue,
        private readonly notificationUtil: NotificationUtil,
        private readonly userCreateUtil: UserCreateUtil,
        private readonly userUtil: UserUtil,
        private readonly workspaceUtil: WorkspaceUtil,
        private readonly deviceUtil: DeviceUtil,
        private readonly databaseService: DatabaseService,
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
        const featureFlagKey =
            this.userCreateUtil.resolveSocialFeatureFlagKey(loginWith);
        const [featureFlag, existing] = await Promise.all([
            this.featureFlagService.getMetadataByKey<{
                [EnumFeatureFlagMetadataKey.signUpAllowed]: boolean;
            }>(featureFlagKey),
            this.userAuthService.getOneByEmail(normalizedEmail),
        ]);
        // Sequential by design: gate before the work it guards
        if (
            existing ||
            !featureFlag?.[EnumFeatureFlagMetadataKey.signUpAllowed]
        ) {
            return null;
        }

        // Sequential by design: gate before the work it guards
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

        const input = this.userCreateUtil.buildSocialCreate(
            normalizedEmail,
            loginWith,
            loginSocial,
            { roleId: role.id, workspaceContext }
        );
        const inputs = [input];
        const inputContext = input.workspaceContext;
        const attempts = this.workspaceUtil.countSlugAttempts(inputs);
        const passwordHistories =
            this.userCreateUtil.buildPasswordHistoryEntries(inputs);
        const termPolicyAcceptances =
            this.userCreateUtil.buildTermPolicyAcceptanceEntries(inputs);
        const userIds = this.userCreateUtil.buildUserIds(inputs);

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

    private async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog = this.sessionService.getRequestLog();
        const { sessionId, jti } = this.authUtil.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtService.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.notificationService.getRecipient(
            user,
            EnumNotificationKind.newDeviceLogin
        );
        const { isNewDevice, revoked, affected, deviceOwnershipId } =
            await this.databaseService.withTransaction(async tx => {
                const upserted = await this.deviceService.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    now
                );
                let revokedSessions: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revokedSessions =
                        await this.sessionService.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                const otherOwnershipIds =
                    await this.deviceService.getOtherOwnershipIdsByDeviceInTx(
                        tx,
                        upserted.device.id,
                        user.id
                    );
                let affectedSessions: ISessionPurgeLoginsPayload[] = [];
                if (otherOwnershipIds.length > 0) {
                    affectedSessions =
                        await this.sessionService.revokeByDeviceOwnershipIdsInTx(
                            tx,
                            otherOwnershipIds,
                            user.id,
                            now
                        );
                }
                await this.sessionService.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userService.updateLoginInTx(
                    tx,
                    user.id,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return {
                    isNewDevice: upserted.isNewDevice,
                    revoked: revokedSessions,
                    affected: affectedSessions,
                    deviceOwnershipId: upserted.deviceOwnership.id,
                };
            });

        const tokens = this.authJwtService.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );
        const promises = [
            this.setLoginOrRevoke(user.id, sessionId, jti),
            this.sessionQueue.purgeLogins(user.id, revoked),
            ...affected.map(({ userId, sessions }) =>
                this.sessionQueue.purgeLogins(userId, sessions)
            ),
        ];
        if (isNewDevice) {
            const loginAtIso = this.helperDateService.formatToIso(loginAt);
            const newDeviceLoginSent =
                this.notificationQueue.sendNewDeviceLogin(
                    recipient,
                    {
                        requestLog,
                        loginFrom,
                        loginWith,
                        loginAt: loginAtIso,
                    },
                    sessionId
                );
            promises.push(newDeviceLoginSent);
        }

        await Promise.all(promises);

        if (affected.length > 0) {
            const prepareRevokeLog = ({
                userId,
                sessions,
            }: ISessionPurgeLoginsPayload): IActivityLogStaged => {
                const metadata =
                    this.sessionUtil.mapActivityLogRevokeAllTargetMetadata(
                        user.id,
                        sessions.length
                    );

                return this.activityLogService.prepare({
                    action: EnumActivityLogAction.userRevokeSessionByDeviceLogin,
                    userId,
                    createdBy: user.id,
                    metadata,
                });
            };
            this.activityLogService.stagePrepared(
                affected.map(prepareRevokeLog)
            );
        }

        return tokens;
    }

    private async setLoginOrRevoke(
        userId: string,
        sessionId: string,
        jti: string
    ): Promise<void> {
        try {
            await this.sessionService.setLogin(userId, sessionId, jti);
        } catch (error: unknown) {
            const revoked = await this.sessionService.revokeIfActive(
                userId,
                sessionId
            );
            await this.sessionQueue.purgeLogins(userId, revoked);

            if (error instanceof AppBaseException) {
                throw error;
            }

            throw new AppUnknownException(error);
        }
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
            const tokens = await this.createTokenAndSession(
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

        const challengePromise = this.authTwoFactorService.createChallenge({
            userId: user.id,
            device,
            loginFrom,
            loginWith,
        });
        const requiresSetup = this.userUtil.requiresTwoFactorSetup(user);
        if (requiresSetup) {
            const [
                { challengeToken, expiresInMs },
                { encryptedSecret, otpauthUrl, secret },
            ] = await Promise.all([
                challengePromise,
                this.userTwoFactorService.setup(user),
            ]);
            await this.userTwoFactorService.saveSetup(user.id, encryptedSecret);

            return {
                isTwoFactorEnable: true,
                lastWorkspaceId,
                lastWorkspaceChangedAt,
                twoFactor: {
                    isRequiredSetup: true,
                    challengeToken,
                    challengeExpiresInMs: expiresInMs,
                    backupCodesRemaining: user.twoFactor.backupCodes.length,
                    otpauthUrl,
                    secret,
                },
            };
        }

        const { challengeToken, expiresInMs } = await challengePromise;

        return {
            isTwoFactorEnable: true,
            lastWorkspaceId,
            lastWorkspaceChangedAt,
            twoFactor: {
                isRequiredSetup: false,
                challengeToken,
                challengeExpiresInMs: expiresInMs,
                backupCodesRemaining: user.twoFactor.backupCodes.length,
            },
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

        const outcome = await this.completeLogin(
            user,
            deviceIdentity,
            from,
            loginWith
        );
        // Sequential by design: write must not run if an earlier step throws
        if (created !== null) {
            const recipient = this.notificationUtil.mapRecipient(
                created.users[0]!,
                EnumNotificationKind.welcomeSocial,
                [],
                []
            );
            await this.notificationQueue.sendWelcomeSocial(recipient);
        }

        return { data: outcome };
    }
}
