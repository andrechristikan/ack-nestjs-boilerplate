import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseUniqueValueGenerationFailedException } from '@common/database/exceptions/database.unique-value-generation-failed.exception';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import {
    EnumActivityLogAction,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import type {
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserTermPolicyContract } from '@modules/user/contracts/user.term-policy.contract';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginSetupTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-setup-two-factor.request.dto';
import type { UserLoginVerifyTwoFactorRequestDto } from '@modules/user/dtos/request/user.login-verify-two-factor.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserTwoFactorEnableResponseDto } from '@modules/user/dtos/response/user.two-factor-enable.response.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserPasswordAttemptMaxException } from '@modules/user/exceptions/user.password-attempt-max.exception';
import type { IUserCreated } from '@modules/user/interfaces/user.create.interface';
import type { IUserLoginRefresh } from '@modules/user/interfaces/user.login.interface';
import type {
    IUser,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserRecipient,
    IUserSignUpWorkspaceContext,
} from '@modules/user/interfaces/user.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Duration } from 'luxon';

/** Owns the transactions that issue sessions: credential, social, and two-factor login, social first sign-in, refresh, and logout. */
@Injectable()
export class UserAuthHttpService {
    private readonly userRoleName: string;
    private readonly createTimeoutInMs: number;

    constructor(
        private readonly userAuthDomain: UserAuthDomain,
        private readonly userDomain: UserDomain,
        private readonly userPasswordDomain: UserPasswordDomain,
        private readonly userTwoFactorDomain: UserTwoFactorDomain,
        private readonly passwordHistoryDomain: PasswordHistoryDomain,
        private readonly notificationDomain: NotificationDomain,
        private readonly termPolicyAcceptanceDomain: TermPolicyAcceptanceDomain,
        private readonly workspaceDomain: WorkspaceDomain,
        private readonly workspaceInviteDomain: WorkspaceInviteDomain,
        private readonly projectMemberDomain: ProjectMemberDomain,
        private readonly roleDomain: RoleDomain,
        private readonly countryDomain: CountryDomain,
        private readonly featureFlagDomain: FeatureFlagDomain,
        private readonly deviceDomain: DeviceDomain,
        private readonly sessionDomain: SessionDomain,
        private readonly authJwtDomain: AuthJwtDomain,
        private readonly authTwoFactorDomain: AuthTwoFactorDomain,
        private readonly activityLogDomain: ActivityLogDomain,
        private readonly sessionQueue: SessionQueue,
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

    private toDeviceIdentity(device: DeviceRequestDto): IDeviceIdentity {
        return {
            fingerprint: device.fingerprint,
            name: device.name ?? null,
            platform: device.platform ?? null,
            notificationToken: device.notificationToken ?? null,
        };
    }

    private async getRecipient(
        user: IUserRecipient,
        kind: EnumNotificationKind
    ): Promise<INotificationRecipient> {
        const [tokens, settings] = await Promise.all([
            this.deviceDomain.getNotificationTokens(user.id),
            this.notificationDomain.getListUserSetting(user.id),
        ]);

        return this.notificationUtil.mapRecipient(user, kind, tokens, settings);
    }

    private async resolveWorkspaceContext(
        inviteToken: string | null,
        email: string,
        username: string
    ): Promise<IUserSignUpWorkspaceContext> {
        if (!inviteToken) {
            const personalContexts =
                this.userCreateUtil.buildPersonalWorkspaceContexts([username]);

            return personalContexts[0]!;
        }

        // Sequential by design: gate before the work it guards
        await this.featureFlagDomain.validateFeatureFlagMetadata(
            'workspace',
            'invitationAllowed'
        );
        const invite = await this.workspaceInviteDomain.validateInviteForEmail(
            inviteToken,
            email
        );

        return this.userCreateUtil.buildInviteWorkspaceContext(invite);
    }

    /** Creates the user a social sign-in introduces, with its workspace and invite join on one transaction, retrying the personal-workspace slug candidates in turn; null when the user already exists or sign-up is closed. */
    private async signUpWithSocial(
        email: string,
        loginWith: EnumUserLoginWith,
        loginSocial: IUserLoginSocial
    ): Promise<IUserCreated | null> {
        // Sequential by design: gate before the work it guards
        const workspaceContext = await this.resolveWorkspaceContext(
            loginSocial.inviteToken,
            email,
            loginSocial.username
        );
        const featureFlagKey =
            this.userCreateUtil.resolveSocialFeatureFlagKey(loginWith);
        const [featureFlag, existing] = await Promise.all([
            this.featureFlagDomain.getMetadataByKey<{
                signUpAllowed: boolean;
            }>(featureFlagKey),
            this.userAuthDomain.getOneByEmail(email),
        ]);
        // Sequential by design: gate before the work it guards
        if (existing || !featureFlag?.signUpAllowed) {
            return null;
        }

        const [role, , usernameCheck] = await Promise.all([
            this.roleDomain.getByName(this.userRoleName),
            this.countryDomain.getOne(loginSocial.countryId),
            this.userDomain.checkUsername(loginSocial.username),
        ]);
        this.userDomain.assertUsernameAvailable(usernameCheck);

        const input = this.userAuthDomain.prepareSocialCreate(
            email,
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
                        await this.termPolicyAcceptanceDomain.assertRequiredPublishedInTx(
                            tx,
                            UserTermPolicyContract.requiredTypes
                        );

                        const created = await this.userDomain.createManyInTx(
                            tx,
                            inputs
                        );
                        await this.passwordHistoryDomain.createManyInTx(
                            tx,
                            passwordHistories
                        );
                        await this.notificationDomain.createDefaultsManyInTx(
                            tx,
                            userIds
                        );

                        const ownedUsers = this.workspaceUtil.buildOwnedUsers(
                            inputs,
                            attempt
                        );
                        await this.workspaceDomain.createOwnedForUsersInTx(
                            tx,
                            ownedUsers
                        );

                        if (
                            inputContext.type ===
                            EnumUserSignUpWorkspaceContextType.invite
                        ) {
                            await this.workspaceInviteDomain.acceptOnSignUpInTx(
                                tx,
                                input.userId,
                                inputContext
                            );
                            if (
                                inputContext.projectId &&
                                inputContext.projectMemberRole
                            ) {
                                await this.projectMemberDomain.createInTx(
                                    tx,
                                    inputContext.projectId,
                                    input.userId,
                                    inputContext.projectMemberRole,
                                    input.userId
                                );
                            }
                        }

                        await this.termPolicyAcceptanceDomain.acceptPublishedManyInTx(
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

    /** Creates the session and stamps the login in one transaction, then signs the tokens and caches the login entry; the sessions of a repeat device are revoked and their cache purge is enqueued with the new-device notice. */
    private async createTokenAndSession(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IAuthToken> {
        const requestLog = this.sessionDomain.getRequestLog();
        const { sessionId, jti } = this.authJwtDomain.createLoginIdentifiers();
        const expiredAt = this.helperDateService.forward(
            loginAt,
            Duration.fromObject({
                seconds:
                    this.authJwtDomain.jwtRefreshTokenExpirationTimeInSeconds,
            })
        );
        const now = this.helperDateService.create();
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRecipient(
            user,
            EnumNotificationKind.newDeviceLogin
        );
        const { isNewDevice, revoked, deviceOwnershipId } =
            await this.databaseService.withTransaction(async tx => {
                const notificationProvider =
                    this.deviceUtil.resolveNotificationProvider(
                        device.platform
                    );
                const upserted = await this.deviceDomain.upsertForLoginInTx(
                    tx,
                    user.id,
                    device,
                    notificationProvider,
                    now
                );
                let revokedSessions: ISessionRef[] = [];
                if (!upserted.isNewDevice) {
                    revokedSessions =
                        await this.sessionDomain.revokeByDeviceOwnershipInTx(
                            tx,
                            user.id,
                            upserted.deviceOwnership.id,
                            user.id,
                            now
                        );
                }
                await this.sessionDomain.createInTx(
                    tx,
                    user.id,
                    sessionId,
                    upserted.deviceOwnership.id,
                    jti,
                    expiredAt,
                    requestLog
                );
                await this.userDomain.updateLoginInTx(
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
                    deviceOwnershipId: upserted.deviceOwnership.id,
                };
            });

        const tokens = this.authJwtDomain.createTokens(
            user,
            { sessionId, jti, deviceOwnershipId, loginAt },
            loginFrom,
            loginWith
        );
        const promises = [
            this.sessionDomain.setLogin(user.id, sessionId, jti),
            this.sessionQueue.purgeLogins(user.id, revoked),
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

        return tokens;
    }

    /** Deactivates the user that spent its password attempts, revokes its sessions and devices on one transaction, and enqueues the session cache purge. */
    private async reachMaxAttempt(userId: string): Promise<void> {
        const now = this.helperDateService.create();
        let revoked: ISessionRef[];

        try {
            revoked = await this.databaseService.withTransaction(async tx => {
                await this.userDomain.deactivateForMaxPasswordAttemptInTx(
                    tx,
                    userId
                );

                const sessions =
                    await this.sessionDomain.revokeActiveByUserInTx(
                        tx,
                        userId,
                        userId,
                        now
                    );
                await this.deviceDomain.revokeAllByUserInTx(
                    tx,
                    userId,
                    userId,
                    now
                );

                return sessions;
            });
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const mapped = this.databaseUtil.toException(err);
            if (mapped instanceof DatabaseWriteConflictException) {
                throw new UserPasswordAttemptMaxException();
            }

            throw new AppUnknownException(err);
        }

        await this.sessionQueue.purgeLogins(userId, revoked);
    }

    /** Creates a fresh email verification, enqueues it, and stages its row; the caller answers the unverified gate. */
    private async sendLoginVerification(user: IUser): Promise<void> {
        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userSendVerificationEmail,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        const recipient = await this.getRecipient(
            user,
            EnumNotificationKind.verificationEmail
        );
        const emailVerification =
            await this.userAuthDomain.persistLoginVerification(user);

        this.activityLogDomain.stagePrepared(activityLogs);

        const expiredAt = this.helperDateService.formatToIso(
            emailVerification.expiredAt
        );
        await this.notificationQueue.sendVerificationEmail(recipient, {
            expiredAt,
            reference: emailVerification.reference,
            link: emailVerification.link,
            expiredInMinutes: emailVerification.expiredInMinutes,
        });
    }

    /** Logs a verified user in: tokens directly, or the two-factor challenge (with a fresh setup when two-factor still requires one). */
    private async resolveLoginOutcome(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith,
        loginAt: Date
    ): Promise<IUserLoginOutcome> {
        const { lastWorkspaceId, lastWorkspaceChangedAt } = user;
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

        const challengePromise = this.authTwoFactorDomain.createChallenge({
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
                this.userTwoFactorDomain.setup(user),
            ]);
            await this.userTwoFactorDomain.saveSetup(user.id, encryptedSecret);

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

    /** Answers the unverified gate, then logs the user in and stages the login rows. */
    private async completeLogin(
        user: IUser,
        device: IDeviceIdentity,
        loginFrom: EnumUserLoginFrom,
        loginWith: EnumUserLoginWith
    ): Promise<IUserLoginOutcome> {
        const isUnverified = this.userUtil.isUnverified(user);
        if (isUnverified) {
            await this.sendLoginVerification(user);
        }
        this.userAuthDomain.assertVerified(user);

        const loginAt = this.helperDateService.create();
        const loginAction =
            this.userUtil.resolveLoginActivityLogAction(loginWith);
        const loginLogs = [
            this.activityLogDomain.prepare({
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
            this.activityLogDomain.stagePrepared(loginLogs);
        } else if (outcome.twoFactor.isRequiredSetup) {
            const setupLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userSetupTwoFactor,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];

            this.activityLogDomain.stagePrepared(setupLogs);
        }

        return outcome;
    }

    /** Rotates the session by compare-and-set on the presented jti; a replayed token revokes the session and answers no tokens with the ref to purge. */
    private async rotateSession(
        user: IUser,
        refreshToken: string
    ): Promise<IUserLoginRefresh> {
        const requestLog = this.sessionDomain.getRequestLog();
        const payload =
            this.authJwtDomain.payloadToken<IAuthJwtRefreshTokenPayload>(
                refreshToken
            );
        const oldJti = this.authJwtDomain.getRefreshJti(payload);
        const { sessionId, userId, loginFrom, loginWith } = payload;
        // Sequential by design: gate before the work it guards
        await this.sessionDomain.getOneActive(userId, sessionId);

        const { jti: newJti, tokens } = this.authJwtDomain.refreshToken(
            user,
            refreshToken
        );
        // Sequential by design: write must not run if an earlier step throws
        const isRotated = await this.databaseService.withTransaction(
            async tx => {
                const isJtiUpdated = await this.sessionDomain.updateJtiInTx(
                    tx,
                    sessionId,
                    oldJti,
                    newJti
                );
                if (!isJtiUpdated) {
                    return false;
                }

                const now = this.helperDateService.create();
                await this.userDomain.updateLoginInTx(
                    tx,
                    userId,
                    loginFrom,
                    loginWith,
                    requestLog.ipAddress,
                    now
                );

                return true;
            }
        );
        if (!isRotated) {
            const revoked = await this.sessionDomain.revokeOnReuse(
                userId,
                sessionId
            );

            return { tokens: null, revoked };
        }

        const cacheUpdate = await this.sessionDomain.updateLogin(
            userId,
            sessionId,
            oldJti,
            newJti
        );
        if (cacheUpdate === EnumSessionCacheUpdate.mismatch) {
            const revoked = await this.sessionDomain.revokeOnReuse(
                userId,
                sessionId
            );

            return { tokens: null, revoked };
        }

        if (cacheUpdate === EnumSessionCacheUpdate.absent) {
            await this.sessionDomain.setLogin(userId, sessionId, newJti);
        }

        return { tokens, revoked: [] };
    }

    async loginWithSocial(
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
        const deviceIdentity = this.toDeviceIdentity(device);
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
                this.activityLogDomain.prepare(stage)
            );

            this.activityLogDomain.stagePrepared(createdLogs);
        }

        let user = await this.userAuthDomain.getOneForSocialLogin(email);
        const isUnverified = this.userUtil.isUnverified(user);
        if (isUnverified) {
            const verifiedLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userVerifiedEmail,
                    userId: user.id,
                    createdBy: user.id,
                }),
            ];
            user = await this.userAuthDomain.verifyEmailBySocial(user);

            this.activityLogDomain.stagePrepared(verifiedLogs);
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

    async loginCredential({
        email,
        password,
        from,
        device,
    }: UserLoginRequestDto): Promise<IResponseReturn<IUserLoginOutcome>> {
        const deviceIdentity = this.toDeviceIdentity(device);
        const attempt =
            await this.userAuthDomain.incrementCredentialAttempt(email);
        if (!attempt.isAttemptCounted) {
            const userId = attempt.user.id;
            const lockoutLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userRevokeAllSessions,
                    userId,
                    createdBy: userId,
                }),
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                    userId,
                    createdBy: userId,
                }),
            ];
            await this.reachMaxAttempt(userId);

            this.activityLogDomain.stagePrepared(lockoutLogs);
        }

        this.userPasswordDomain.assertAttemptCounted(attempt.isAttemptCounted);

        const isMatch = await this.userAuthDomain.verifyCredential(
            attempt,
            password
        );
        if (!isMatch) {
            const failedLogs = [
                this.activityLogDomain.prepare({
                    action: EnumActivityLogAction.userLoginFailed,
                    userId: attempt.user.id,
                    createdBy: attempt.user.id,
                }),
            ];

            this.activityLogDomain.stagePrepared(failedLogs);
        }
        this.userAuthDomain.assertPasswordMatched(isMatch);

        const outcome = await this.completeLogin(
            attempt.user,
            deviceIdentity,
            from,
            EnumUserLoginWith.credential
        );

        return { data: outcome };
    }

    async loginVerifyTwoFactor({
        challengeToken,
        code,
        backupCode,
        method,
    }: UserLoginVerifyTwoFactorRequestDto): Promise<
        IResponseReturn<IAuthToken>
    > {
        const challenge =
            await this.authTwoFactorDomain.getChallenge(challengeToken);

        const user = await this.userTwoFactorDomain.getOneForLoginVerify(
            challenge.userId
        );
        // Sequential by design: gate before the work it guards
        const verified = await this.userTwoFactorDomain.verify(user, {
            code: code ?? null,
            backupCode: backupCode ?? null,
            method,
        });
        const verifyLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        // Sequential by design: write must not run if an earlier step throws
        await this.userTwoFactorDomain.recordVerification(user, verified);

        this.activityLogDomain.stagePrepared(verifyLogs);

        const loginAction = this.userUtil.resolveLoginActivityLogAction(
            challenge.loginWith
        );
        const loginLogs = [
            this.activityLogDomain.prepare({
                action: loginAction,
                userId: user.id,
                createdBy: user.id,
            }),
        ];
        const loginAt = this.helperDateService.create();
        const [tokens] = await Promise.all([
            this.createTokenAndSession(
                user,
                challenge.device,
                challenge.loginFrom,
                challenge.loginWith,
                loginAt
            ),
            this.authTwoFactorDomain.deleteChallenge(challengeToken),
        ]);

        this.activityLogDomain.stagePrepared(loginLogs);

        return { data: tokens };
    }

    async loginSetupTwoFactor({
        code,
        challengeToken,
    }: UserLoginSetupTwoFactorRequestDto): Promise<
        IResponseReturn<UserTwoFactorEnableResponseDto>
    > {
        const challenge =
            await this.authTwoFactorDomain.getChallenge(challengeToken);

        const { user, pendingSecret } =
            await this.userTwoFactorDomain.getOneForLoginSetup(
                challenge.userId
            );
        // Sequential by design: gate before the work it guards
        await this.userTwoFactorDomain.verifySetupCode(
            user,
            pendingSecret,
            code
        );

        const activityLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userEnableTwoFactor,
            }),
        ];
        const backupCodes = await this.userTwoFactorDomain.enableTwoFactor(
            user.id,
            pendingSecret
        );

        this.activityLogDomain.stagePrepared(activityLogs);

        return { data: { backupCodes } };
    }

    async refresh(
        user: IUser,
        refreshToken: string
    ): Promise<IResponseReturn<IAuthToken>> {
        const refreshLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRefreshToken,
            }),
        ];
        const reuseLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userRevokeSession,
            }),
        ];
        const { tokens, revoked } = await this.rotateSession(
            user,
            refreshToken
        );
        if (tokens === null) {
            await this.sessionQueue.purgeLogins(user.id, revoked);

            this.activityLogDomain.stagePrepared(reuseLogs);
        }

        const refreshed = this.sessionDomain.getRefreshedTokens(tokens);

        this.activityLogDomain.stagePrepared(refreshLogs);

        return { data: refreshed };
    }

    async logout(
        userId: string,
        sessionId: string,
        deviceOwnershipId: string
    ): Promise<IResponseReturn<void>> {
        const logoutLogs = [
            this.activityLogDomain.prepare({
                action: EnumActivityLogAction.userLogout,
            }),
        ];
        // Sequential by design: gate before the work it guards
        await this.sessionDomain.validateActive(userId, sessionId);

        const now = this.helperDateService.create();
        await this.databaseService.withTransaction(async tx => {
            await this.sessionDomain.revokeInTx(
                tx,
                userId,
                sessionId,
                userId,
                now
            );
            await this.deviceDomain.clearNotificationInTx(
                tx,
                userId,
                deviceOwnershipId,
                userId,
                now
            );
        });

        await this.sessionQueue.purgeLogins(userId, [{ id: sessionId }]);

        this.activityLogDomain.stagePrepared(logoutLogs);

        return {};
    }
}
