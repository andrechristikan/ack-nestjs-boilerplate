import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import { DatabaseWriteConflictException } from '@common/database/exceptions/database.write-conflict.exception';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { RedisUnavailableException } from '@common/redis/exceptions/redis.unavailable.exception';
import { EnumRequestStatusCodeError } from '@common/request/enums/request.status-code.enum';
import type { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestContextMissingException } from '@common/request/exceptions/request.context-missing.exception';
import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Country,
    DeviceOwnership,
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import { AuthTwoFactorDomain } from '@modules/auth/domains/auth.two-factor.domain';
import { EnumAuthTwoFactorMethod } from '@modules/auth/enums/auth.enum';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthJwtRefreshTokenInvalidException } from '@modules/auth/exceptions/auth.jwt-refresh-token-invalid.exception';
import { AuthTwoFactorAttemptMaxException } from '@modules/auth/exceptions/auth.two-factor-attempt-max.exception';
import { AuthTwoFactorChallengeInvalidException } from '@modules/auth/exceptions/auth.two-factor-challenge-invalid.exception';
import type {
    IAuthAccessTokenGenerate,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthToken,
    IAuthTwoFactorChallengeCache,
} from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { DeviceDomain } from '@modules/device/domains/device.domain';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceUtil } from '@modules/device/utils/device.util';
import type { DeviceRequestDto } from '@modules/device/dtos/request/device.request.dto';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import {
    EnumFeatureFlagKey,
    EnumFeatureFlagMetadataKey,
} from '@modules/feature-flag/enums/feature-flag.enum';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type { INotificationRecipient } from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { SessionDomain } from '@modules/session/domains/session.domain';
import { EnumSessionCacheUpdate } from '@modules/session/enums/session.enum';
import { EnumSessionStatusCodeError } from '@modules/session/enums/session.status-code.enum';
import { SessionRevokedException } from '@modules/session/exceptions/session.revoked.exception';
import { SessionNotFoundException } from '@modules/session/exceptions/session.not-found.exception';
import type { ISessionRef } from '@modules/session/interfaces/session.interface';
import { SessionQueue } from '@modules/session/queues/session.queue';
import { UserQueue } from '@modules/user/queues/user.queue';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserPasswordDomain } from '@modules/user/domains/user.password.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserTwoFactorVerifyResult,
} from '@modules/user/interfaces/user.interface';
import { UserAuthHttpService } from '@modules/user/services/http/user.auth.http.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceMemberDomain } from '@modules/workspace/domains/workspace.member.domain';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import {
    expectSessionRevoked,
    stubUserRefreshSession,
} from '@test/unit/helpers/test.unit.user-refresh.helper';
import type { IUserRefreshSessionDoubles } from '@test/unit/helpers/test.unit.user-refresh.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';

describe('UserAuthHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userPasswordDomain: MockProxy<UserPasswordDomain> =
        mock<UserPasswordDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userUtil: MockProxy<UserUtil> = mock<UserUtil>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const termPolicyAcceptanceDomain: MockProxy<TermPolicyAcceptanceDomain> =
        mock<TermPolicyAcceptanceDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceMemberDomain: MockProxy<WorkspaceMemberDomain> =
        mock<WorkspaceMemberDomain>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const deviceDomain: MockProxy<DeviceDomain> = mock<DeviceDomain>();
    const deviceUtil: MockProxy<DeviceUtil> = mock<DeviceUtil>();
    const sessionDomain: MockProxy<SessionDomain> = mock<SessionDomain>();
    const sessionQueue: MockProxy<SessionQueue> = mock<SessionQueue>();
    const userQueue: MockProxy<UserQueue> = mock<UserQueue>();
    const authJwtDomain: MockProxy<AuthJwtDomain> = mock<AuthJwtDomain>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const authTwoFactorDomain: MockProxy<AuthTwoFactorDomain> =
        mock<AuthTwoFactorDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const refreshSessionDoubles: IUserRefreshSessionDoubles = {
        authJwtDomain,
        sessionDomain,
    };

    let service: UserAuthHttpService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const loginAt = new Date('2026-03-01T00:05:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.create.timeoutInMs': 5000,
    };
    const requestLog: IRequestLog = {
        userAgent: {
            ua: 'ua',
            browser: null,
            cpu: null,
            device: null,
            engine: null,
            os: null,
        },
        ipAddress: '127.0.0.1',
        geoLocation: null,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens,
    };
    const device = { fingerprint: 'device-bramble' };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: null,
        notificationToken: null,
    };
    const activityLog: IActivityLogStaged = {
        action: EnumActivityLogAction.userLoginCredential,
        metadata: {},
        userId: null,
        createdBy: null,
        workspaceId: null,
    };
    const recipient: INotificationRecipient = {
        ...TestRecipient,
        userId: 'user-bramble',
    };
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: 'encrypted-secret',
        pendingSecret: null,
        backupCodes: ['hash-one'],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        lastUsedStep: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const baseUser: IUser = {
        id: 'user-bramble',
        name: 'Bramble Fox',
        username: 'bramble2fox',
        isVerified: true,
        verifiedAt: new Date('2026-01-01T00:00:00.000Z'),
        email: 'bramble@example.com',
        roleId: 'role-bramble',
        password: 'hashed-password',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordAttempt: 0,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: null,
        countryId: 'country-bramble',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-bramble',
            name: 'user',
            description: null,
            type: EnumRoleType.user,
            isImmutable: false,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const enabledTwoFactor = { ...twoFactor, enabled: true };
    const twoFactorUser: IUser = {
        ...baseUser,
        twoFactor: enabledTwoFactor,
    };
    const committedUser: IUser = { ...baseUser, twoFactor };
    const ownership: DeviceOwnership = {
        id: 'device-ownership-bramble',
        deviceId: 'device-bramble',
        userId: 'user-bramble',
        revokedAt: null,
        isRevoked: false,
        revokedById: null,
        lastActiveAt: now,
        notificationToken: 'token-bramble',
        notificationProvider: null,
        biometricEnabled: false,
        biometricToken: null,
        biometricType: null,
        biometricEnabledAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
    };
    const upsert: IDeviceLoginUpsert = {
        device: {
            id: 'device-bramble',
            fingerprint: 'device-bramble',
            name: null,
            platform: EnumDevicePlatform.android,
            lastActiveAt: now,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
        },
        deviceOwnership: ownership,
        isNewDevice: true,
    };
    const revokedRef: ISessionRef[] = [{ id: 'session-bramble' }];
    const country: Country = {
        id: 'country-bramble',
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        phoneCode: ['62'],
        continent: 'Asia',
        timezone: 'Asia/Jakarta',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const personalContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const inviteContext: IUserSignUpWorkspaceInvite = {
        type: EnumUserSignUpWorkspaceContextType.invite,
        workspaceId: 'workspace-invite',
        workspaceInviteId: 'invite-bramble',
        invitedByUserId: 'user-inviter',
        workspaceMemberRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectMemberRole: EnumProjectMemberRole.admin,
    };
    const password: IAuthPassword = {
        passwordHash: 'hashed',
        passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
        passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
        passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
    };
    const input: IUserCreateWithWorkspaceInput = {
        userId: 'user-bramble',
        email: 'bramble@example.com',
        name: null,
        username: 'bramble2fox',
        countryId: 'country-bramble',
        roleId: 'role-bramble',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        verification: {
            reference: 'VRF-bramble',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            to: 'bramble@example.com',
            expiredAt: new Date('2026-03-05T00:00:00.000Z'),
            verifiedAt: null,
            isUsed: false,
        },
        workspaceContext: personalContext,
        createdBy: 'user-bramble',
    };
    const inviteInput: IUserCreateWithWorkspaceInput = {
        ...input,
        workspaceContext: inviteContext,
    };
    const historyEntry: IPasswordHistoryCreate = {
        userId: 'user-bramble',
        password: 'hashed',
        type: EnumPasswordHistoryType.signUp,
        expiredAt: password.passwordPeriodExpired,
        createdAt: password.passwordCreated,
        createdBy: 'user-bramble',
    };
    const acceptanceEntry: ITermPolicyAcceptanceCreate = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
        createdBy: 'user-bramble',
    };
    const stageInput = {
        action: EnumActivityLogAction.userSignedUp,
        userId: 'user-bramble',
        createdBy: 'user-bramble',
        metadata: {},
    };
    const clearUsername: IUserCheckUsername = {
        badWord: false,
        exist: false,
        pattern: false,
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        type: EnumRoleType.user,
        isImmutable: false,
    };
    const invite: WorkspaceInvite = {
        id: 'invite-bramble',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: 'user-inviter',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: 'user-inviter',
        workspaceId: 'workspace-invite',
        email: 'bramble@example.com',
        token: 'hashed-token',
        workspaceRole: EnumWorkspaceMemberRole.member,
        projectId: 'project-bramble',
        projectRole: EnumProjectMemberRole.admin,
        reference: 'WIN-bramble',
        expiredAt: new Date('2026-02-01T00:00:00.000Z'),
        status: EnumWorkspaceInviteStatus.pending,
        invitedByUserId: 'user-inviter',
        acceptedAt: null,
        acceptedByUserId: null,
        nonce: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    };
    const challenge: IAuthTwoFactorChallengeCache = {
        userId: 'user-bramble',
        device: deviceIdentity,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    };
    const verified: IUserTwoFactorVerifyResult = {
        method: EnumAuthTwoFactorMethod.code,
        newBackupCodes: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        helperDateService.create.mockReturnValue(now);
        helperDateService.forward.mockImplementation(date => date);
        helperDateService.formatToIso.mockReturnValue(
            '2026-03-05T00:00:00.000Z'
        );
        sessionDomain.getRequestLog.mockReturnValue(requestLog);
        activityLogDomain.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userUtil.resolveLoginActivityLogAction.mockReturnValue(
            EnumActivityLogAction.userLoginCredential
        );
        userUtil.isUnverified.mockReturnValue(false);
        userUtil.isTwoFactorEnabled.mockReturnValue(false);
        userUtil.requiresTwoFactorSetup.mockReturnValue(false);
        deviceDomain.getNotificationTokens.mockResolvedValue(['token-bramble']);
        notificationDomain.getListUserSetting.mockResolvedValue([]);
        deviceDomain.upsertForLoginInTx.mockResolvedValue(upsert);
        deviceUtil.resolveNotificationProvider.mockReturnValue(null);
        deviceUtil.toIdentity.mockReturnValue(deviceIdentity);
        authUtil.createLoginIdentifiers.mockReturnValue({
            sessionId: 'session-bramble',
            jti: 'jti-bramble',
        });
        authJwtDomain.createTokens.mockReturnValue(tokens);
        Object.defineProperty(
            authJwtDomain,
            'jwtRefreshTokenExpirationTimeInSeconds',
            { value: 2592000, configurable: true }
        );
        userDomain.createManyInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildPasswordHistoryEntries.mockReturnValue([
            historyEntry,
        ]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            acceptanceEntry,
        ]);
        userCreateUtil.buildUserIds.mockReturnValue(['user-bramble']);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleDomain.getByName.mockResolvedValue(role);
        countryDomain.getOne.mockResolvedValue(country);
        workspaceMemberDomain.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserDomain, useValue: userDomain },
                {
                    provide: UserPasswordDomain,
                    useValue: userPasswordDomain,
                },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                { provide: UserUtil, useValue: userUtil },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: NotificationDomain, useValue: notificationDomain },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                {
                    provide: TermPolicyAcceptanceDomain,
                    useValue: termPolicyAcceptanceDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                {
                    provide: WorkspaceMemberDomain,
                    useValue: workspaceMemberDomain,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: DeviceDomain, useValue: deviceDomain },
                { provide: DeviceUtil, useValue: deviceUtil },
                { provide: SessionDomain, useValue: sessionDomain },
                { provide: SessionQueue, useValue: sessionQueue },
                { provide: UserQueue, useValue: userQueue },
                { provide: AuthJwtDomain, useValue: authJwtDomain },
                { provide: AuthUtil, useValue: authUtil },
                {
                    provide: AuthTwoFactorDomain,
                    useValue: authTwoFactorDomain,
                },
                { provide: ActivityLogDomain, useValue: activityLogDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        service = module.get(UserAuthHttpService);
    });

    describe('loginWithSocial', () => {
        const dto: UserCreateSocialRequestDto = {
            username: 'bramble2fox',
            name: 'Bramble Fox',
            countryId: 'country-bramble',
            marketing: true,
            cookies: true,
            from: EnumUserLoginFrom.website,
            device,
        };
        const social: IUserLoginSocial = {
            from: dto.from,
            device: deviceIdentity,
            username: dto.username,
            inviteToken: null,
            name: dto.name!,
            countryId: dto.countryId,
            cookies: dto.cookies,
            marketing: dto.marketing,
        };

        beforeEach(() => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(null);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            featureFlagDomain.getMetadataByKey.mockResolvedValue({
                [EnumFeatureFlagMetadataKey.signUpAllowed]: true,
            });
            userAuthDomain.getOneByEmail.mockResolvedValue(null);
            userCreateUtil.buildSocialCreate.mockReturnValue(input);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(baseUser);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginGoogle
            );
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
            userCreateUtil.resolveSocialFeatureFlagKey.mockReturnValue(
                EnumFeatureFlagKey.loginWithGoogle
            );
        });

        it('commits the new user, stages the created rows, logs in, and sends the social welcome after the login', async () => {
            const callOrder: string[] = [];
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(
                committedUser
            );
            userDomain.createManyInTx.mockResolvedValue([committedUser]);
            userDomain.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('login');

                return baseUser;
            });
            notificationQueue.sendWelcomeSocial.mockImplementation(async () => {
                callOrder.push('sendWelcomeSocial');
            });

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithGoogle
            );
            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(device);
            expect(userCreateUtil.buildSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenNthCalledWith(
                1,
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.social,
                [input],
                [committedUser]
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcomeSocial,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeSocial).toHaveBeenCalledWith(
                recipient
            );
            expect(callOrder).toEqual(['login', 'sendWelcomeSocial']);
        });

        it('logs an existing user in without creating one or sending a welcome', async () => {
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(roleDomain.getByName).not.toHaveBeenCalled();
            expect(userAuthDomain.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle
            );
            expect(userAuthDomain.verifyEmailBySocial).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('reads the apple flag for an apple sign-in', async () => {
            userCreateUtil.resolveSocialFeatureFlagKey.mockReturnValue(
                EnumFeatureFlagKey.loginWithApple
            );

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(
                userCreateUtil.resolveSocialFeatureFlagKey
            ).toHaveBeenCalledWith(EnumUserLoginWith.socialApple);
            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                EnumFeatureFlagKey.loginWithApple
            );
        });

        it('creates a new invited user, joins the workspace, and issues tokens', async () => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(
                committedUser
            );

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'invite-bramble' }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(projectMemberDomain.createInTx).toHaveBeenCalledBefore(
                userDomain.updateLoginInTx
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('leaves no user row when the workspace join fails', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            workspaceInviteDomain.acceptOnSignUpInTx.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'invite-bramble' }
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userDomain.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(
                termPolicyAcceptanceDomain.acceptPublishedManyInTx
            ).not.toHaveBeenCalled();
            expect(userAuthDomain.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
        });

        it('passes a null name and forwards the invite token', async () => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            const dtoWithoutName: UserCreateSocialRequestDto = {
                username: dto.username,
                countryId: dto.countryId,
                marketing: dto.marketing,
                cookies: dto.cookies,
                from: dto.from,
                device,
                inviteToken: 'invite-bramble',
            };

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(userCreateUtil.buildSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({
                    name: null,
                    inviteToken: 'invite-bramble',
                }),
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('skips the invite and the sign-up gates for an existing user', async () => {
            workspaceInviteDomain.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'stale-token' }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteDomain.getSignUpInvite
            ).not.toHaveBeenCalled();
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).not.toHaveBeenCalled();
            expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
        });

        it('resolves the invite once the user is known to be new', async () => {
            workspaceInviteDomain.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...dto, inviteToken: 'raw-token' }
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledBefore(
                workspaceInviteDomain.getSignUpInvite
            );
            expect(userAuthDomain.getOneByEmail).toHaveBeenCalledBefore(
                workspaceInviteDomain.getSignUpInvite
            );
        });

        it('validates the invite against the trimmed lowercase email', async () => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await service.loginWithSocial(
                ' Bramble@Example.COM ',
                EnumUserLoginWith.socialGoogle,
                { ...dto, inviteToken: 'invite-bramble' }
            );

            expect(workspaceInviteDomain.getSignUpInvite).toHaveBeenCalledWith(
                'invite-bramble',
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(invite, dto.username);
        });

        it.each([null, { [EnumFeatureFlagMetadataKey.signUpAllowed]: false }])(
            'creates no user when the flag metadata is %j',
            async metadata => {
                featureFlagDomain.getMetadataByKey.mockResolvedValue(metadata);

                await service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                );

                expect(roleDomain.getByName).not.toHaveBeenCalled();
                expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
                expect(
                    notificationQueue.sendWelcomeSocial
                ).not.toHaveBeenCalled();
            }
        );

        it('answers the country gate before the username gate', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({ module: 'country' });
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(userCreateUtil.buildSocialCreate).not.toHaveBeenCalled();
        });

        it('marks an unverified user verified and stages the row before logging in', async () => {
            userUtil.isUnverified.mockReturnValueOnce(true);
            const unverified = { ...baseUser, isVerified: false };
            userAuthDomain.getOneByEmail.mockResolvedValue(baseUser);
            userAuthDomain.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthDomain.verifyEmailBySocial.mockResolvedValue(baseUser);

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifiedEmail,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userAuthDomain.verifyEmailBySocial).toHaveBeenCalledWith(
                unverified
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                requestLog.ipAddress,
                now
            );
        });

        it('rejects without the welcome when the login of a new user fails', async () => {
            const failure = new Error('login failed');
            userAuthDomain.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                service.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);
            expect(notificationQueue.sendWelcomeSocial).not.toHaveBeenCalled();
        });
    });

    describe('loginCredential', () => {
        const dto: UserLoginRequestDto = {
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plain-password',
            from: EnumUserLoginFrom.website,
            device,
        };
        const counted = {
            user: baseUser,
            hashedPassword: 'hashed-password',
            isAttemptCounted: true,
        };
        const lastWorkspace = {
            lastWorkspaceId: 'workspace-stale',
            lastWorkspaceChangedAt: new Date('2026-02-01T00:00:00.000Z'),
        };

        beforeEach(() => {
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(
                counted
            );
            userAuthDomain.verifyCredential.mockResolvedValue(true);
        });

        it('logs the user in on one transaction and purges the session cache entries of a repeat device after the commit', async () => {
            const callOrder: string[] = [];
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });
            sessionDomain.revokeByDeviceOwnershipInTx.mockResolvedValue(
                revokedRef
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: tokenOutcome,
            });

            expect(
                userAuthDomain.incrementCredentialAttempt
            ).toHaveBeenCalledWith(dto.email);
            expect(
                userPasswordDomain.assertAttemptCounted
            ).toHaveBeenCalledWith(counted.isAttemptCounted);
            expect(userAuthDomain.verifyCredential).toHaveBeenCalledWith(
                counted,
                dto.password
            );
            expect(userAuthDomain.assertCredentialMatched).toHaveBeenCalledWith(
                true
            );
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                null,
                now
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                now,
                requestLog
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('logs in on the device identity DeviceUtil shapes from the request device', async () => {
            const requestDevice: DeviceRequestDto = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            const fullDevice: IDeviceIdentity = {
                fingerprint: 'device-bramble',
                name: 'Bramble phone',
                platform: EnumDevicePlatform.ios,
                notificationToken: 'token-bramble',
            };
            deviceUtil.toIdentity.mockReturnValue(fullDevice);

            await service.loginCredential({ ...dto, device: requestDevice });

            expect(deviceUtil.toIdentity).toHaveBeenCalledWith(requestDevice);
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                fullDevice,
                null,
                now
            );
            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                EnumDevicePlatform.ios
            );
        });

        it('stages the login row once the tokens are issued', async () => {
            await service.loginCredential(dto);

            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginCredential,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('stages the failed-login row before the mismatch is answered', async () => {
            const failure = new Error('not match');
            userAuthDomain.verifyCredential.mockResolvedValue(false);
            userAuthDomain.assertCredentialMatched.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLoginFailed,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledBefore(
                userAuthDomain.assertCredentialMatched
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('enqueues the lockout and stages both rows before the attempt limit is answered', async () => {
            const spent = { ...counted, isAttemptCounted: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue(spent);
            const failure = new Error('attempt max');
            const callOrder: string[] = [];
            userPasswordDomain.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw failure;
            });
            userQueue.lockout.mockImplementation(async () => {
                callOrder.push('lockout');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(userQueue.lockout).toHaveBeenCalledWith('user-bramble');
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(1, {
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.prepare).toHaveBeenNthCalledWith(2, {
                action: EnumActivityLogAction.userReachMaxPasswordAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(callOrder).toEqual(['lockout', 'stagePrepared', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userAuthDomain.verifyCredential).not.toHaveBeenCalled();
        });

        it('answers the unverified gate without sending a verification email or issuing a session', async () => {
            const unverified = { ...baseUser, isVerified: false };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: unverified,
            });
            const failure = new Error('not verified');
            userAuthDomain.assertVerified.mockImplementation(() => {
                throw failure;
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(userAuthDomain.assertVerified).toHaveBeenCalledWith(
                unverified
            );
            expect(
                notificationQueue.sendVerificationEmail
            ).not.toHaveBeenCalled();
            expect(
                notificationDomain.getListUserSetting
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an already set-up two-factor user', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: twoFactorUser,
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: false,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                    },
                },
            });

            expect(authTwoFactorDomain.createChallenge).toHaveBeenCalledWith({
                userId: 'user-bramble',
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('creates a challenge and a fresh setup, stores the secret, and stages the setup row when two-factor requires setup', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                        otpauthUrl: 'otpauth://totp/secret',
                        secret: 'secret',
                    },
                },
            });

            expect(userTwoFactorDomain.setup).toHaveBeenCalledWith(
                requiresSetup
            );
            expect(userTwoFactorDomain.saveSetup).toHaveBeenCalledWith(
                'user-bramble',
                'encrypted-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userSetupTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
        });

        it('writes no secret when the challenge fails during setup', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            const requiresSetup: IUser = {
                ...twoFactorUser,
                twoFactor: { ...twoFactor, enabled: true, requiredSetup: true },
            };
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: requiresSetup,
            });
            const failure = new Error('challenge failed');
            authTwoFactorDomain.createChallenge.mockRejectedValue(failure);
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(service.loginCredential(dto)).rejects.toBe(failure);

            expect(userTwoFactorDomain.saveSetup).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('returns the resolved lastWorkspaceId on the token outcome', async () => {
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...baseUser, ...lastWorkspace },
            });
            workspaceMemberDomain.resolveLastWorkspaceId.mockResolvedValue(
                'workspace-resolved'
            );

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    ...tokenOutcome,
                    lastWorkspaceId: 'workspace-resolved',
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                },
            });

            expect(
                workspaceMemberDomain.resolveLastWorkspaceId
            ).toHaveBeenCalledTimes(1);
            expect(
                workspaceMemberDomain.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });

        it('returns the resolved lastWorkspaceId on the two-factor outcome', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: { ...twoFactorUser, ...lastWorkspace },
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: {
                        isRequiredSetup: false,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                    },
                },
            });

            expect(
                workspaceMemberDomain.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });

        it('returns the resolved lastWorkspaceId on the two-factor setup outcome', async () => {
            userUtil.isTwoFactorEnabled.mockReturnValue(true);
            userUtil.requiresTwoFactorSetup.mockReturnValue(true);
            userAuthDomain.incrementCredentialAttempt.mockResolvedValue({
                ...counted,
                user: {
                    ...twoFactorUser,
                    ...lastWorkspace,
                    twoFactor: {
                        ...twoFactor,
                        enabled: true,
                        requiredSetup: true,
                    },
                },
            });
            authTwoFactorDomain.createChallenge.mockResolvedValue({
                challengeToken: 'challenge-token',
                expiresInMs: 60000,
            });
            userTwoFactorDomain.setup.mockResolvedValue({
                encryptedSecret: 'encrypted-secret',
                otpauthUrl: 'otpauth://totp/secret',
                secret: 'secret',
            });

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: {
                    isTwoFactorEnable: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt:
                        lastWorkspace.lastWorkspaceChangedAt,
                    twoFactor: {
                        isRequiredSetup: true,
                        challengeToken: 'challenge-token',
                        challengeExpiresInMs: 60000,
                        backupCodesRemaining: 1,
                        otpauthUrl: 'otpauth://totp/secret',
                        secret: 'secret',
                    },
                },
            });

            expect(
                workspaceMemberDomain.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', 'workspace-stale');
        });
    });

    describe('loginVerifyTwoFactor', () => {
        const dto = {
            challengeToken: 'challenge-token',
            method: EnumAuthTwoFactorMethod.code,
            code: '123456',
        };

        beforeEach(() => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            authTwoFactorDomain.consumeChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginVerify.mockResolvedValue(
                twoFactorUser
            );
            userTwoFactorDomain.countAttempt.mockResolvedValue(true);
            userTwoFactorDomain.verify.mockResolvedValue(verified);
            userUtil.resolveLoginActivityLogAction.mockReturnValue(
                EnumActivityLogAction.userLoginCredential
            );
        });

        it('verifies the challenge user, claims the challenge, records the verification, issues the session on one transaction, and stages both rows', async () => {
            const callOrder: string[] = [];
            userTwoFactorDomain.countAttempt.mockImplementation(async () => {
                callOrder.push('countAttempt');

                return true;
            });
            userTwoFactorDomain.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assertAttemptCounted');
            });
            userTwoFactorDomain.verify.mockImplementation(async () => {
                callOrder.push('verify');

                return verified;
            });
            authTwoFactorDomain.consumeChallenge.mockImplementation(
                async () => {
                    callOrder.push('consumeChallenge');

                    return challenge;
                }
            );
            userTwoFactorDomain.recordVerification.mockImplementation(
                async () => {
                    callOrder.push('recordVerification');
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginVerifyTwoFactor(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorDomain.getChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: '123456',
                    backupCode: null,
                    method: EnumAuthTwoFactorMethod.code,
                }
            );
            expect(userTwoFactorDomain.recordVerification).toHaveBeenCalledWith(
                twoFactorUser,
                verified
            );
            expect(deviceDomain.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                deviceIdentity,
                null,
                now
            );
            expect(sessionDomain.createInTx).toHaveBeenCalledTimes(1);
            expect(userDomain.updateLoginInTx).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(authTwoFactorDomain.consumeChallenge).toHaveBeenCalledWith(
                'challenge-token'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userVerifyTwoFactor,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(userUtil.resolveLoginActivityLogAction).toHaveBeenCalledWith(
                EnumUserLoginWith.credential
            );
            expect(callOrder).toEqual([
                'countAttempt',
                'assertAttemptCounted',
                'verify',
                'consumeChallenge',
                'recordVerification',
                'stagePrepared',
                'committed',
                'stagePrepared',
            ]);
        });

        it('claims the challenge once and issues tokens after the setup step left it in place', async () => {
            userTwoFactorDomain.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorDomain.countAttempt.mockResolvedValue(true);
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);

            await service.loginSetupTwoFactor({
                challengeToken: 'challenge-token',
                code: '123456',
            });

            expect(authTwoFactorDomain.consumeChallenge).not.toHaveBeenCalled();

            await expect(service.loginVerifyTwoFactor(dto)).resolves.toEqual({
                data: tokens,
            });

            expect(authTwoFactorDomain.getChallenge).toHaveBeenCalledTimes(2);
            expect(authTwoFactorDomain.consumeChallenge).toHaveBeenCalledTimes(
                1
            );
        });

        it('forwards the backup code', async () => {
            await service.loginVerifyTwoFactor({
                challengeToken: 'challenge-token',
                method: EnumAuthTwoFactorMethod.backupCodes,
                backupCode: 'backup-code',
            });

            expect(userTwoFactorDomain.verify).toHaveBeenCalledWith(
                twoFactorUser,
                {
                    code: null,
                    backupCode: 'backup-code',
                    method: EnumAuthTwoFactorMethod.backupCodes,
                }
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                service.loginVerifyTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorDomain.getOneForLoginVerify
            ).not.toHaveBeenCalled();
        });

        it('enqueues the lockout and stages both rows before the two-factor attempt limit is answered', async () => {
            userTwoFactorDomain.countAttempt.mockResolvedValue(false);
            const callOrder: string[] = [];
            userTwoFactorDomain.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw new AuthTwoFactorAttemptMaxException();
            });
            userQueue.lockout.mockImplementation(async () => {
                callOrder.push('lockout');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.loginVerifyTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(userQueue.lockout).toHaveBeenCalledWith('user-bramble');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(callOrder).toEqual(['lockout', 'stagePrepared', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verify).not.toHaveBeenCalled();
            expect(authTwoFactorDomain.consumeChallenge).not.toHaveBeenCalled();
        });

        it('issues nothing and stages nothing when the verification fails', async () => {
            const failure = new Error('invalid code');
            userTwoFactorDomain.verify.mockRejectedValue(failure);

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(
                userTwoFactorDomain.recordVerification
            ).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('leaves the challenge claimable when the code is wrong', async () => {
            userTwoFactorDomain.verify.mockRejectedValue(
                new Error('invalid code')
            );

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toThrow(
                'invalid code'
            );

            expect(authTwoFactorDomain.consumeChallenge).not.toHaveBeenCalled();
        });

        it('creates no session when the challenge claim fails', async () => {
            const failure = new Error('redis down');
            authTwoFactorDomain.consumeChallenge.mockRejectedValue(failure);

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(
                userTwoFactorDomain.recordVerification
            ).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).not.toHaveBeenCalled();
        });

        it('stages no login row when the session transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);
            const callOrder: string[] = [];
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(service.loginVerifyTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(callOrder).toEqual(['stagePrepared']);
        });
    });

    describe('loginSetupTwoFactor', () => {
        const dto = { challengeToken: 'challenge-token', code: '123456' };

        beforeEach(() => {
            authTwoFactorDomain.getChallenge.mockResolvedValue(challenge);
            userTwoFactorDomain.getOneForLoginSetup.mockResolvedValue({
                user: twoFactorUser,
                pendingSecret: 'pending-secret',
            });
            userTwoFactorDomain.countAttempt.mockResolvedValue(true);
            userTwoFactorDomain.enableTwoFactor.mockResolvedValue([
                'backup-one',
            ]);
        });

        it('verifies the setup code against the pending secret, enables two-factor, and stages the row', async () => {
            await expect(service.loginSetupTwoFactor(dto)).resolves.toEqual({
                data: { backupCodes: ['backup-one'] },
            });

            expect(
                userTwoFactorDomain.getOneForLoginSetup
            ).toHaveBeenCalledWith('user-bramble');
            expect(userTwoFactorDomain.verifySetupCode).toHaveBeenCalledWith(
                twoFactorUser,
                'pending-secret',
                '123456'
            );
            expect(userTwoFactorDomain.enableTwoFactor).toHaveBeenCalledWith(
                'user-bramble',
                'pending-secret'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userEnableTwoFactor,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledWith(
                twoFactorUser
            );
            expect(userTwoFactorDomain.countAttempt).toHaveBeenCalledBefore(
                userTwoFactorDomain.verifySetupCode
            );
            expect(userTwoFactorDomain.verifySetupCode).toHaveBeenCalledBefore(
                userTwoFactorDomain.enableTwoFactor
            );
        });

        it('throws AuthTwoFactorChallengeInvalidException without reading the user when the challenge is missing', async () => {
            authTwoFactorDomain.getChallenge.mockRejectedValue(
                new AuthTwoFactorChallengeInvalidException()
            );

            await expect(
                service.loginSetupTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorChallengeInvalid,
            });
            expect(
                userTwoFactorDomain.getOneForLoginSetup
            ).not.toHaveBeenCalled();
        });

        it('enqueues the lockout and stages both rows before the two-factor attempt limit is answered', async () => {
            userTwoFactorDomain.countAttempt.mockResolvedValue(false);
            const callOrder: string[] = [];
            userTwoFactorDomain.assertAttemptCounted.mockImplementation(() => {
                callOrder.push('assert');

                throw new AuthTwoFactorAttemptMaxException();
            });
            userQueue.lockout.mockImplementation(async () => {
                callOrder.push('lockout');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.loginSetupTwoFactor(dto)
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.twoFactorAttemptMax,
                statusCodeKey:
                    EnumAuthStatusCodeError[
                        EnumAuthStatusCodeError.twoFactorAttemptMax
                    ],
                messagePath: 'auth.error.twoFactorAttemptMax',
            });

            expect(userQueue.lockout).toHaveBeenCalledWith('user-bramble');
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeAllSessions,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userReachMaxTwoFactorAttempt,
                userId: 'user-bramble',
                createdBy: 'user-bramble',
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
                activityLog,
            ]);
            expect(callOrder).toEqual(['lockout', 'stagePrepared', 'assert']);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.verifySetupCode).not.toHaveBeenCalled();
            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
        });

        it('enables nothing when the setup code is wrong', async () => {
            const failure = new Error('invalid code');
            userTwoFactorDomain.verifySetupCode.mockRejectedValue(failure);

            await expect(service.loginSetupTwoFactor(dto)).rejects.toBe(
                failure
            );

            expect(userTwoFactorDomain.enableTwoFactor).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: now,
            userId: 'user-bramble',
            sessionId: 'session-bramble',
            deviceOwnershipId: 'device-ownership-bramble',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            jti: 'old-jti',
        };
        const refreshed: IAuthAccessTokenGenerate = {
            tokens,
            jti: 'new-jti',
            sessionId: 'session-bramble',
        };

        it('rotates the session by compare-and-set, stamps the login, rotates the cached entry, and stages the refresh row in order', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockReturnValue(tokens);
            const callOrder: string[] = [];
            sessionDomain.updateJtiInTx.mockImplementation(async () => {
                callOrder.push('updateJtiInTx');

                return true;
            });
            userDomain.updateLoginInTx.mockImplementation(async () => {
                callOrder.push('updateLoginInTx');

                return baseUser;
            });
            sessionDomain.updateLogin.mockImplementation(async () => {
                callOrder.push('updateLogin');

                return EnumSessionCacheUpdate.updated;
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionDomain.updateJtiInTx).toHaveBeenCalledWith(
                tx,
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(sessionDomain.updateLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'old-jti',
                'new-jti'
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRefreshToken,
            });
            expect(sessionDomain.getRefreshedTokens).toHaveBeenCalledWith(
                tokens
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'updateJtiInTx',
                'updateLoginInTx',
                'updateLogin',
                'stagePrepared',
            ]);
        });

        it('writes a fresh login entry when the cached one expired with the access token', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockReturnValue(tokens);
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).resolves.toEqual({ data: tokens });

            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'new-jti'
            );
            expect(sessionDomain.revokeIfActive).not.toHaveBeenCalled();
        });

        it('revokes the rotated session, purges it, and rethrows when the fresh login entry cannot be written', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.absent
            );
            const failure = new RedisUnavailableException();
            sessionDomain.setLogin.mockRejectedValue(failure);
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toBe(failure);

            expect(sessionDomain.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
        });

        it('throws RequestContextMissingException before reading the token when the store has no request log', async () => {
            sessionDomain.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
                messagePath: 'request.error.contextMissing',
            });
            expect(authJwtDomain.payloadToken).not.toHaveBeenCalled();
        });

        it('throws AuthJwtRefreshTokenInvalidException when the token carries no jti', async () => {
            authJwtDomain.payloadToken.mockReturnValue(payload);
            authJwtDomain.getRefreshJti.mockImplementation(() => {
                throw new AuthJwtRefreshTokenInvalidException();
            });

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'auth',
                statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                messagePath: 'auth.error.refreshTokenUnauthorized',
            });
        });

        it('enqueues an empty purge and answers revoked when the jti compare-and-set matches no row of an already revoked session', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeIfActive.mockResolvedValue([]);

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionDomain.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(sessionDomain.updateLogin).not.toHaveBeenCalled();
        });

        it('revokes the session after the commit, purges it, stages the revoke row, and answers revoked when the jti compare-and-set matches no row', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionDomain.revokeIfActive.mockImplementation(async () => {
                callOrder.push('revokeIfActive');

                return revokedRef;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionDomain.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(sessionDomain.getRefreshedTokens).toHaveBeenCalledWith(null);
            expect(userDomain.updateLoginInTx).not.toHaveBeenCalled();
            expect(sessionDomain.updateLogin).not.toHaveBeenCalled();
            expect(callOrder).toEqual([
                'committed',
                'revokeIfActive',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('revokes the session and answers revoked when the cached jti is not the one presented', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateLogin.mockResolvedValue(
                EnumSessionCacheUpdate.mismatch
            );
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
        });

        it('stages no reuse row when nothing was revoked', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeIfActive.mockResolvedValue([]);

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('stages the reuse row when a session was revoked', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            sessionDomain.updateJtiInTx.mockResolvedValue(false);
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userRevokeSession,
            });
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledTimes(1);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
        });

        it('answers SessionRevokedException on a write conflict and revokes nothing', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            sessionDomain.getRefreshedTokens.mockImplementation(() => {
                throw new SessionRevokedException();
            });
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expectSessionRevoked(
                service.refresh(baseUser, 'refresh-token')
            );

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(sessionDomain.revokeIfActive).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(sessionDomain.getRefreshedTokens).toHaveBeenCalledWith(null);
            expect(sessionDomain.updateLogin).not.toHaveBeenCalled();
        });

        it('rethrows an app exception raised while rotating the session unchanged', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new SessionRevokedException();
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toBe(failure);
            expect(databaseUtil.toException).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while rotating the session in the unknown exception', async () => {
            stubUserRefreshSession(refreshSessionDoubles, {
                payload,
                oldJti: 'old-jti',
                refreshed,
            });
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.refresh(baseUser, 'refresh-token')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('revokes the session and clears the device notification on one transaction, then purges the session and stages the logout row', async () => {
            const callOrder: string[] = [];
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            sessionQueue.purgeLogins.mockImplementation(async () => {
                callOrder.push('purgeLogins');
            });
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });

            await expect(
                service.logout(
                    'user-bramble',
                    'session-bramble',
                    'device-ownership-bramble'
                )
            ).resolves.toEqual({});

            expect(sessionDomain.revokeInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'user-bramble',
                now
            );
            expect(deviceDomain.clearNotificationInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'device-ownership-bramble',
                'user-bramble',
                now
            );
            expect(sessionDomain.revokeInTx).toHaveBeenCalledBefore(
                deviceDomain.clearNotificationInTx
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                [{ id: 'session-bramble' }]
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith({
                action: EnumActivityLogAction.userLogout,
            });
            expect(callOrder).toEqual([
                'committed',
                'purgeLogins',
                'stagePrepared',
            ]);
        });

        it('rethrows the not-found of the guarded revoke without clearing the device, purging, or staging', async () => {
            const failure = new SessionNotFoundException();
            databaseService.withTransaction.mockImplementation(async fn =>
                fn(tx)
            );
            sessionDomain.revokeInTx.mockRejectedValue(failure);

            await expect(
                service.logout('user-bramble', 'session-bramble', 'device')
            ).rejects.toBe(failure);
            expect(deviceDomain.clearNotificationInTx).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('answers SessionNotFoundException on a write conflict with one run, no purge, and no staged row', async () => {
            const conflict = new Error('write conflict');
            databaseService.withTransaction.mockRejectedValue(conflict);
            databaseUtil.toException.mockReturnValue(
                new DatabaseWriteConflictException()
            );

            await expect(
                service.logout('user-bramble', 'session-bramble', 'device')
            ).rejects.toMatchObject({
                module: 'session',
                statusCode: EnumSessionStatusCodeError.notFound,
                statusCodeKey:
                    EnumSessionStatusCodeError[
                        EnumSessionStatusCodeError.notFound
                    ],
                messagePath: 'session.error.notFound',
            });

            expect(databaseUtil.toException).toHaveBeenCalledWith(conflict);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });

        it('wraps any other failure raised while logging out in the unknown exception without purging or staging', async () => {
            const failure = new Error('boom');
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.toException.mockReturnValue(null);

            await expect(
                service.logout('user-bramble', 'session-bramble', 'device')
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
        });
    });

    describe('signUpWithSocial', () => {
        const social: IUserLoginSocial = {
            from: EnumUserLoginFrom.website,
            device: deviceIdentity,
            username: 'bramble2fox',
            inviteToken: 'invite-bramble',
            name: 'Bramble Fox',
            countryId: 'country-bramble',
            cookies: true,
            marketing: true,
        };

        beforeEach(() => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );
            userCreateUtil.resolveSocialFeatureFlagKey.mockReturnValue(
                EnumFeatureFlagKey.loginWithGoogle
            );
            featureFlagDomain.getMetadataByKey.mockResolvedValue({
                [EnumFeatureFlagMetadataKey.signUpAllowed]: true,
            });
            userAuthDomain.getOneByEmail.mockResolvedValue(null);
            userCreateUtil.buildSocialCreate.mockReturnValue(inviteInput);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
        });

        it('runs every write on one transaction in sign-up order', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-invite',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const created = await service['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );

            expect(created).toEqual({
                inputs: [inviteInput],
                users: [committedUser],
            });
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userDomain.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(passwordHistoryDomain.createManyInTx).toHaveBeenCalledWith(
                tx,
                [historyEntry]
            );
            expect(
                notificationDomain.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble']);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                0
            );
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(
                termPolicyAcceptanceDomain.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledBefore(userDomain.createManyInTx);
            expect(userDomain.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryDomain.createManyInTx
            );
            expect(passwordHistoryDomain.createManyInTx).toHaveBeenCalledBefore(
                notificationDomain.createDefaultsManyInTx
            );
            expect(
                notificationDomain.createDefaultsManyInTx
            ).toHaveBeenCalledBefore(workspaceDomain.createOwnedForUsersInTx);
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteDomain.acceptOnSignUpInTx);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberDomain.createInTx);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledBefore(
                termPolicyAcceptanceDomain.acceptPublishedManyInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            userCreateUtil.buildSocialCreate.mockReturnValue({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRole: null,
                },
            });

            await service['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            userCreateUtil.buildSocialCreate.mockReturnValue({
                ...input,
                password: null,
                passwordHistoryType: null,
                verification: null,
            });

            await service['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...social, inviteToken: null }
            );

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('inserts nothing when a required term policy is not published', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceDomain.assertRequiredPublishedInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(
                service['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toBe(failure);
            expect(userDomain.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const created = await service['signUpWithSocial'](
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social
            );

            expect(created).toEqual({
                inputs: [inviteInput],
                users: [committedUser],
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                1
            );
            expect(databaseUtil.isUniqueCollision).toHaveBeenCalledWith(
                collision,
                'slug'
            );
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            databaseService.withTransaction.mockRejectedValue(
                new Error('slug collision')
            );
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            await expect(
                service['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the create util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userCreateUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                service['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toBe(mapped);
            expect(userCreateUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the create util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                service['signUpWithSocial'](
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });

    describe('createTokenAndSession', () => {
        it('reads the recipient, creates the session on the transaction, stamps the login, caches the entry, and enqueues the purge and the new-device notice', async () => {
            const callOrder: string[] = [];
            notificationDomain.getListUserSetting.mockImplementation(
                async () => {
                    callOrder.push('getRecipient');

                    return [];
                }
            );
            databaseService.withTransaction.mockImplementation(async fn => {
                const result = await fn(tx);
                callOrder.push('committed');

                return result as never;
            });
            authJwtDomain.createTokens.mockImplementation(() => {
                callOrder.push('createTokens');

                return tokens;
            });
            sessionDomain.setLogin.mockImplementation(async () => {
                callOrder.push('setLogin');
            });

            const result = await service['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(result).toBe(tokens);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                baseUser,
                EnumNotificationKind.newDeviceLogin,
                ['token-bramble'],
                []
            );
            expect(
                sessionDomain.revokeByDeviceOwnershipInTx
            ).not.toHaveBeenCalled();
            expect(sessionDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble',
                'jti-bramble',
                loginAt,
                requestLog
            );
            expect(userDomain.updateLoginInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                requestLog.ipAddress,
                now
            );
            expect(authJwtDomain.createTokens).toHaveBeenCalledWith(
                baseUser,
                {
                    sessionId: 'session-bramble',
                    jti: 'jti-bramble',
                    deviceOwnershipId: 'device-ownership-bramble',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(sessionDomain.setLogin).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'jti-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledWith(
                recipient,
                {
                    requestLog,
                    loginFrom: EnumUserLoginFrom.website,
                    loginWith: EnumUserLoginWith.credential,
                    loginAt: '2026-03-05T00:00:00.000Z',
                },
                'session-bramble'
            );
            expect(callOrder).toEqual([
                'getRecipient',
                'committed',
                'createTokens',
                'setLogin',
            ]);
        });

        it('announces no new device for an existing one', async () => {
            deviceDomain.upsertForLoginInTx.mockResolvedValue({
                ...upsert,
                isNewDevice: false,
            });

            await service['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(notificationQueue.sendNewDeviceLogin).not.toHaveBeenCalled();
        });

        it('revokes the new session, purges it, and rethrows when the login cache write rejects, still enqueueing the repeat-device purge and the new-device notice', async () => {
            const failure = new Error('cache down');
            sessionDomain.setLogin.mockRejectedValue(failure);
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({ rawError: failure });
            expect(sessionDomain.revokeIfActive).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble'
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                revokedRef
            );
            expect(sessionQueue.purgeLogins).toHaveBeenCalledWith(
                'user-bramble',
                []
            );
            expect(notificationQueue.sendNewDeviceLogin).toHaveBeenCalledTimes(
                1
            );
        });

        it('rethrows a typed login cache failure unwrapped after the compensating revoke', async () => {
            const failure = new RedisUnavailableException();
            sessionDomain.setLogin.mockRejectedValue(failure);
            sessionDomain.revokeIfActive.mockResolvedValue(revokedRef);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(sessionDomain.revokeIfActive).toHaveBeenCalledTimes(1);
        });

        it('revokes nothing when the login cache write succeeds', async () => {
            await service['createTokenAndSession'](
                baseUser,
                deviceIdentity,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(sessionDomain.revokeIfActive).not.toHaveBeenCalled();
        });

        it('resolves the notification provider from a null platform when the device carries none', async () => {
            await service['createTokenAndSession'](
                baseUser,
                { ...deviceIdentity, platform: null },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential,
                loginAt
            );

            expect(deviceUtil.resolveNotificationProvider).toHaveBeenCalledWith(
                null
            );
        });

        it('fails the login before the transaction when the recipient read rejects', async () => {
            const failure = new Error('recipient-unavailable');
            notificationDomain.getListUserSetting.mockRejectedValue(failure);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('throws RequestContextMissingException before any write when the store has no request log', async () => {
            sessionDomain.getRequestLog.mockImplementation(() => {
                throw new RequestContextMissingException(RequestLogStoreKey);
            });

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toMatchObject({
                module: 'request',
                statusCode: EnumRequestStatusCodeError.contextMissing,
            });
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('signs nothing and writes no cache key when the transaction fails', async () => {
            const failure = new Error('tx failed');
            databaseService.withTransaction.mockRejectedValue(failure);

            await expect(
                service['createTokenAndSession'](
                    baseUser,
                    deviceIdentity,
                    EnumUserLoginFrom.website,
                    EnumUserLoginWith.credential,
                    loginAt
                )
            ).rejects.toBe(failure);
            expect(authJwtDomain.createTokens).not.toHaveBeenCalled();
            expect(sessionDomain.setLogin).not.toHaveBeenCalled();
            expect(sessionQueue.purgeLogins).not.toHaveBeenCalled();
        });
    });
});
