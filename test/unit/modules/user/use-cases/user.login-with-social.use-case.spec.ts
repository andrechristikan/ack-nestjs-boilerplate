import { buildDeferred } from '@test/unit/helpers/test.unit.deferred.helper';
import type { IActivityLogCreateManyEffect } from '@modules/activity-log/interfaces/activity-log.interface';
import type { INotificationNotifyEffect } from '@modules/notification/interfaces/notification.interface';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { OutboxService } from '@common/outbox/services/outbox.service';
import { EnumQueuePriority } from '@common/queue/enums/queue.enum';
import { DatabaseWriteConflictCode } from '@common/database/constants/database.constant';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumDevicePlatform,
    EnumMfaChallengePurpose,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type { Country, WorkspaceInvite } from '@generated/prisma-client/client';
import { ActivityLogQueue } from '@modules/activity-log/queues/activity-log.queue';
import {
    EnumActivityLogProcess,
    EnumActivityLogQueue,
} from '@modules/activity-log/enums/activity-log.enum';
import type {
    IAuthPassword,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import { AuthSocialGoogleInvalidException } from '@modules/auth/exceptions/auth.social-google-invalid.exception';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import type {
    IDeviceIdentity,
    IDeviceLoginUpsert,
} from '@modules/device/interfaces/device.interface';
import { DeviceService } from '@modules/device/services/device.service';
import { DeviceUtil } from '@modules/device/utils/device.util';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import {
    EnumNotificationKind,
    EnumNotificationProcess,
    EnumNotificationQueue,
} from '@modules/notification/enums/notification.enum';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import { NotificationService } from '@modules/notification/services/notification.service';
import { UserRegistrationService } from '@modules/user/services/user.registration.service';
import { UserService } from '@modules/user/services/user.service';
import { UserSocialService } from '@modules/user/services/user.social.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import { EnumUserCreateWorkspaceContextType } from '@modules/user/enums/user.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { UserNotFoundException } from '@modules/user/exceptions/user.not-found.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserAuthOutcome,
    IUserLoginSocial,
    IUserAuthMfaChallenge,
    IUserCreateWorkspaceInvite,
    IUserCreateWorkspacePersonal,
} from '@modules/user/interfaces/user.interface';
import type { IUserAuthSession } from '@modules/user/interfaces/user.auth.interface';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { EnumMfaMethod } from '@modules/mfa/enums/mfa.enum';
import type { IMfaPasskeyCredential } from '@modules/mfa/interfaces/mfa.interface';
import { MfaChallengeService } from '@modules/mfa/services/mfa.challenge.service';
import { MfaPasskeyService } from '@modules/mfa/services/mfa.passkey.service';
import { MfaService } from '@modules/mfa/services/mfa.service';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { UserUtil } from '@modules/user/utils/user.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceMemberService } from '@modules/workspace/services/workspace.member.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { UserLoginWithSocialUseCase } from '@modules/user/use-cases/user.login-with-social.use-case';
import {
    buildApiKeyContext,
    buildAuthSocialContext,
    buildRequestContext,
    buildUser,
} from '@test/unit/helpers/test.unit.request.helper';
import { buildPrismaKnownRequestError } from '@test/unit/helpers/test.unit.database.helper';
import { TestUnitUserConfigValues } from '@test/unit/helpers/test.unit.user.helper';

describe('UserLoginWithSocialUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userSocialService: MockProxy<UserSocialService> =
        mock<UserSocialService>();
    const mfaService: MockProxy<MfaService> = mock<MfaService>();
    const mfaPasskeyService: MockProxy<MfaPasskeyService> =
        mock<MfaPasskeyService>();
    const mfaChallengeService: MockProxy<MfaChallengeService> =
        mock<MfaChallengeService>();
    const deviceService: MockProxy<DeviceService> = mock<DeviceService>();
    const userRegistrationService: MockProxy<UserRegistrationService> =
        mock<UserRegistrationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceMemberService: MockProxy<WorkspaceMemberService> =
        mock<WorkspaceMemberService>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogQueue: MockProxy<ActivityLogQueue> =
        mock<ActivityLogQueue>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const outboxService: MockProxy<OutboxService> = mock<OutboxService>();
    let useCase: UserLoginWithSocialUseCase;
    let databaseUtil: DatabaseUtil;
    let helperStringService: HelperStringService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        ...TestUnitUserConfigValues,
        'workspace.slugMaxAttempts': 2,
        'user.default.role': 'user',
        'user.create.timeoutInMs': 5000,
    };
    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    };
    const tokenOutcome: IUserAuthOutcome = {
        isMfaRequired: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens,
    };
    const device = {
        fingerprint: 'device-bramble',
        platform: EnumDevicePlatform.web,
    };
    const deviceIdentity: IDeviceIdentity = {
        fingerprint: 'device-bramble',
        name: null,
        platform: EnumDevicePlatform.web,
        notificationToken: null,
    };
    const upserted = {
        device: { id: 'device-one' },
        deviceOwnership: { id: 'ownership-one' },
        isNewDevice: true,
        otherOwnershipIds: [],
    } as unknown as IDeviceLoginUpsert;
    const requestContext = buildRequestContext();
    const apiKeyContext = buildApiKeyContext();
    const authContext = buildAuthSocialContext(
        'bramble@example.com',
        'subject-bramble'
    );
    const entryEffect: IActivityLogCreateManyEffect = {
        queue: EnumActivityLogQueue.activityLog,
        name: EnumActivityLogProcess.createMany,
        data: { rows: [] },
        priority: EnumQueuePriority.low,
        idempotencyKey: null,
    };
    const welcomeSocialEffect: INotificationNotifyEffect = {
        queue: EnumNotificationQueue.notification,
        name: EnumNotificationProcess.notify,
        data: {
            kind: EnumNotificationKind.welcomeSocial,
            context: {
                userId: 'user-bramble',
                proceedBy: 'user-bramble',
                snapshot: null,
                verificationId: null,
            },
            recipient: null,
            notificationId: null,
        },
        priority: EnumQueuePriority.medium,
        idempotencyKey: 'welcomeSocial-user-bramble',
    };
    const baseUser: IUser = {
        ...buildUser('user-bramble', 'bramble@example.com'),
        isVerified: true,
    };
    const committedUser: IUser = baseUser;
    const passkeyOptions: PublicKeyCredentialRequestOptionsJSON = {
        challenge: 'challenge-webauthn',
    };
    const passkeyCredentials: IMfaPasskeyCredential[] = [
        { credentialId: 'credential-bramble', transports: ['internal'] },
    ];
    const mfaChallenge: IUserAuthMfaChallenge = {
        challengeToken: 'challenge-token',
        expiresInMs: 60000,
        methods: [EnumMfaMethod.passkey, EnumMfaMethod.backupCode],
        passkeyOptions: { challenge: 'challenge-webauthn' },
    };
    const session: IUserAuthSession = {
        tokens,
        sessionId: 'session-bramble',
    };
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
    const personalContext: IUserCreateWorkspacePersonal = {
        type: EnumUserCreateWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble', 'w-bramble-b'],
        name: "bramble2fox's Workspace",
    };
    const inviteContext: IUserCreateWorkspaceInvite = {
        type: EnumUserCreateWorkspaceContextType.invite,
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
        verifiedAt: null,
        acceptedTermPolicyTypes: [EnumTermPolicyType.termsOfService],
        password,
        passwordHistoryType: EnumPasswordHistoryType.signUp,
        verification: {
            reference: 'VRF-bramble',
            token: 'hashed-token',
            type: EnumVerificationType.email,
            action: null,
            mobileNumberId: null,
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
    const acceptanceEntry: ITermPolicyAcceptanceCreate = {
        userId: 'user-bramble',
        types: [EnumTermPolicyType.termsOfService],
        createdBy: 'user-bramble',
    };
    const stageInput = {
        action: EnumActivityLogAction.userCreated,
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
    beforeAll(() => {
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    beforeEach(async () => {
        databaseService.withTransaction.mockImplementation(
            async fn => fn(tx) as never
        );
        vi.setSystemTime(now);
        activityLogQueue.recordEffect.mockReturnValue(entryEffect);
        notificationQueue.notify.mockReturnValue(welcomeSocialEffect);
        mfaService.isEnabled.mockResolvedValue(false);
        mfaPasskeyService.getCredentialsByUser.mockResolvedValue([]);
        mfaService.getLoginMethods.mockResolvedValue([EnumMfaMethod.totp]);
        deviceService.upsertForLoginInTx.mockResolvedValue(upserted);
        mfaChallengeService.createInTx.mockResolvedValue({
            challengeToken: mfaChallenge.challengeToken,
            expiresInMs: mfaChallenge.expiresInMs,
        });
        userAuthService.createTokenAndSessionInTx.mockResolvedValue(session);
        userService.createManyInTx.mockResolvedValue([committedUser]);
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);
        workspaceMemberService.resolveLastWorkspaceId.mockResolvedValue(null);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserLoginWithSocialUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserService, useValue: userService },
                { provide: UserSocialService, useValue: userSocialService },
                {
                    provide: UserRegistrationService,
                    useValue: userRegistrationService,
                },
                { provide: NotificationQueue, useValue: notificationQueue },
                {
                    provide: TermPolicyAcceptanceService,
                    useValue: termPolicyAcceptanceService,
                },
                { provide: WorkspaceService, useValue: workspaceService },
                {
                    provide: WorkspaceInviteService,
                    useValue: workspaceInviteService,
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: workspaceMemberService,
                },
                {
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogQueue, useValue: activityLogQueue },
                UserCreateUtil,
                HelperStringService,
                UserUtil,
                { provide: MfaService, useValue: mfaService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                {
                    provide: NotificationService,
                    useValue: notificationService,
                },

                { provide: MfaPasskeyService, useValue: mfaPasskeyService },
                { provide: MfaChallengeService, useValue: mfaChallengeService },
                { provide: DeviceService, useValue: deviceService },
                WorkspaceUtil,
                DeviceUtil,
                { provide: DatabaseService, useValue: databaseService },
                { provide: OutboxService, useValue: outboxService },
                DatabaseUtil,
                HelperDateService,
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserLoginWithSocialUseCase);
        databaseUtil = module.get(DatabaseUtil);
        helperStringService = module.get(HelperStringService);
    });

    describe('execute', () => {
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
            workspaceInviteService.getSignUpInvite.mockResolvedValue(null);
            vi.spyOn(databaseUtil, 'createId').mockReturnValue(
                'workspace-bramble'
            );
            vi.spyOn(helperStringService, 'random')
                .mockReturnValueOnce('bramble')
                .mockReturnValueOnce('bramble-b');
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                true
            );
            userSocialService.getUserIdBySubject.mockResolvedValue(null);
            userRegistrationService.buildSocialCreate.mockReturnValue(input);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userAuthService.getOneForSocialLogin.mockResolvedValue(baseUser);
        });

        it('logs the user linked to the subject in without the email lookup or the sign-up check', async () => {
            userSocialService.getUserIdBySubject.mockResolvedValue(
                'user-bramble'
            );
            userAuthService.getOneForSocialLoginById.mockResolvedValue(
                baseUser
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(userSocialService.getUserIdBySubject).toHaveBeenCalledWith(
                EnumUserLoginWith.socialGoogle,
                'subject-bramble'
            );
            expect(
                userAuthService.getOneForSocialLoginById
            ).toHaveBeenCalledWith('user-bramble');
            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
            expect(userSocialService.linkInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                deviceIdentity,
                now
            );
        });

        it('commits the new user, the social welcome effect, the created entries, and the session on one tx', async () => {
            const callOrder: string[] = [];
            userService.createManyInTx.mockResolvedValue([committedUser]);
            userAuthService.createTokenAndSessionInTx.mockImplementation(
                async () => {
                    callOrder.push('login');

                    return session;
                }
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle
            );
            expect(
                userRegistrationService.buildSocialCreate
            ).toHaveBeenCalledWith(
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
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                null,
                stageInput
            );
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                { userId: 'user-bramble', proceedBy: 'user-bramble' }
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                welcomeSocialEffect,
                entryEffect,
                entryEffect,
            ]);
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledWith('user-bramble', null);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                committedUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                committedUser.id,
                deviceIdentity,
                now
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(callOrder).toEqual(['login']);
        });

        it('logs an existing user in without creating one or sending a welcome', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                deviceIdentity,
                now
            );
            expect(
                mfaPasskeyService.getCredentialsByUser
            ).not.toHaveBeenCalled();
            expect(mfaService.getLoginMethods).not.toHaveBeenCalled();
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
        });

        it('links the subject of a new user inside the sign-up transaction after the user row', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(userSocialService.linkInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialApple,
                'subject-bramble',
                'user-bramble'
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                userSocialService.linkInTx
            );
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
        });

        it('links the subject to the account holding the email before the session is created', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(userSocialService.assertLinkable).toHaveBeenCalledWith(
                'user-bramble',
                EnumUserLoginWith.socialGoogle
            );
            expect(userSocialService.linkInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                EnumUserLoginWith.socialGoogle,
                'subject-bramble',
                'user-bramble'
            );
            expect(userSocialService.assertLinkable).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(userSocialService.linkInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('rejects with the not found exception and opens no transaction when no account holds the email', async () => {
            const failure = new UserNotFoundException();
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);

            expect(userSocialService.assertLinkable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('rejects with the provider exception and writes nothing when the account holds another subject', async () => {
            const failure = new AuthSocialGoogleInvalidException(
                'Google subject does not match the linked account'
            );
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userSocialService.assertLinkable.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userSocialService.linkInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('creates a challenge and issues nothing for an MFA user', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(baseUser);
            mfaService.isEnabled.mockResolvedValue(true);
            mfaPasskeyService.getCredentialsByUser.mockResolvedValue(
                passkeyCredentials
            );
            mfaService.getLoginMethods.mockResolvedValue(mfaChallenge.methods);
            mfaPasskeyService.getAssertionOptions.mockResolvedValue(
                passkeyOptions
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).resolves.toEqual({
                data: {
                    isMfaRequired: true,
                    lastWorkspaceId: null,
                    lastWorkspaceChangedAt: null,
                    mfa: mfaChallenge,
                },
            });

            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).toHaveBeenCalledBefore(mfaChallengeService.createInTx);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: baseUser.id,
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.socialGoogle,
                webAuthnChallenge: 'challenge-webauthn',
            });
            expect(mfaPasskeyService.getCredentialsByUser).toHaveBeenCalledWith(
                baseUser.id
            );
            expect(mfaService.getLoginMethods).toHaveBeenCalledWith(
                baseUser.id,
                passkeyCredentials
            );
            expect(mfaPasskeyService.getAssertionOptions).toHaveBeenCalledWith(
                passkeyCredentials
            );
            expect(
                mfaPasskeyService.getCredentialsByUser
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(mfaService.getLoginMethods).toHaveBeenCalledBefore(
                databaseService.withTransaction
            );
            expect(
                mfaPasskeyService.getAssertionOptions
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(mfaService.isEnabled).toHaveBeenCalledWith('user-bramble');
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
        });

        it('checks the sign-up gate with the apple provider for an apple sign-in', async () => {
            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialApple,
                dto
            );

            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialApple
            );
        });

        it('creates a new invited user, joins the workspace, and issues tokens', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'invite-bramble',
                    }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(projectMemberService.createInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('leaves no user row when the workspace join fails', async () => {
            const failure = new WorkspaceInviteInvalidException();
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );
            workspaceInviteService.acceptOnSignUpInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'invite-bramble',
                    }
                )
            ).rejects.toBe(failure);

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).not.toHaveBeenCalled();
            expect(userAuthService.getOneForSocialLogin).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
        });

        it('passes a null name and forwards the invite token', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            const dtoWithoutName: UserCreateSocialRequestDto = {
                username: dto.username,
                countryId: dto.countryId,
                marketing: dto.marketing,
                cookies: dto.cookies,
                from: dto.from,
                device,
                inviteToken: 'invite-bramble',
            };

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(
                userRegistrationService.buildSocialCreate
            ).toHaveBeenCalledWith(
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
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'stale-token',
                    }
                )
            ).resolves.toEqual({ data: tokenOutcome });

            expect(
                workspaceInviteService.getSignUpInvite
            ).not.toHaveBeenCalled();
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
        });

        it('resolves the invite once the user is known to be new', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    {
                        ...dto,
                        inviteToken: 'raw-token',
                    }
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
            });
            expect(
                userRegistrationService.isSocialSignUpAllowed
            ).toHaveBeenCalledBefore(workspaceInviteService.getSignUpInvite);
        });

        it('validates the invite against the trimmed lowercase email', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                { ...authContext, email: ' Bramble@Example.COM ' },
                EnumUserLoginWith.socialGoogle,
                { ...dto, inviteToken: 'invite-bramble' }
            );

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                'invite-bramble',
                'bramble@example.com'
            );
        });

        it('creates no user when sign-up is not allowed', async () => {
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(roleService.getByName).not.toHaveBeenCalled();
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
            expect(notificationQueue.notify).not.toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                expect.anything()
            );
        });

        it('answers the country gate before the username gate', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userRegistrationService.buildSocialCreate
            ).not.toHaveBeenCalled();
        });

        it('verifies an unverified user and starts the session on one tx', async () => {
            const unverified = { ...baseUser, isVerified: false };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthService.verifyEmailBySocialInTx.mockResolvedValue(baseUser);

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                unverified
            );
            expect(userAuthService.assertVerified).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                deviceIdentity,
                now
            );
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledBefore(userAuthService.createTokenAndSessionInTx);
        });

        it('starts the email verification while the link is pending, then the session with the verified user', async () => {
            const unverified = { ...baseUser, isVerified: false };
            const link = buildDeferred<void>();
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(unverified);
            userAuthService.verifyEmailBySocialInTx.mockResolvedValue(baseUser);
            userSocialService.linkInTx.mockReturnValue(link.promise);

            const running = useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                unverified
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();

            link.resolve();
            await running;

            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                baseUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                baseUser.id,
                deviceIdentity,
                now
            );
        });

        it('verifies an unverified MFA user and creates the challenge on one tx', async () => {
            const mfaUser: IUser = { ...baseUser, isVerified: false };
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockResolvedValue(mfaUser);
            mfaService.isEnabled.mockResolvedValue(true);
            userAuthService.verifyEmailBySocialInTx.mockResolvedValue({
                ...mfaUser,
                isVerified: true,
            });

            await useCase.execute(
                requestContext,
                apiKeyContext,
                authContext,
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledWith(tx, requestContext, apiKeyContext, mfaUser);
            expect(mfaChallengeService.createInTx).toHaveBeenCalledWith(tx, {
                purpose: EnumMfaChallengePurpose.login,
                userId: mfaUser.id,
                device: deviceIdentity,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.socialGoogle,
                webAuthnChallenge: null,
            });
            expect(
                mfaPasskeyService.getAssertionOptions
            ).not.toHaveBeenCalled();
            expect(
                userAuthService.verifyEmailBySocialInTx
            ).toHaveBeenCalledBefore(mfaChallengeService.createInTx);
        });

        it('answers the lookup error of an existing-user path whose email holds no user', async () => {
            const failure = new UserNotFoundException();
            userRegistrationService.isSocialSignUpAllowed.mockResolvedValue(
                false
            );
            userAuthService.getOneForSocialLogin.mockRejectedValue(failure);

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('wraps a session failure of a new user, whose sign-up shares the transaction', async () => {
            const failure = new Error('session failed');
            userAuthService.createTokenAndSessionInTx.mockRejectedValue(
                failure
            );

            await expect(
                useCase.execute(
                    requestContext,
                    apiKeyContext,
                    authContext,
                    EnumUserLoginWith.socialGoogle,
                    dto
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: failure,
            });
            expect(
                workspaceMemberService.resolveLastWorkspaceId
            ).not.toHaveBeenCalled();
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
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userRegistrationService.buildSocialCreate.mockReturnValue(
                inviteInput
            );
            userService.checkUsername.mockResolvedValue(clearUsername);
        });

        it("writes each user's Mfa row, password history, and notification defaults on tx right after the users", async () => {
            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(mfaService.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble'
            );
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [
                    {
                        userId: 'user-bramble',
                        password: 'hashed',
                        type: EnumPasswordHistoryType.signUp,
                        expiredAt: new Date('2026-04-01T00:00:00.000Z'),
                        createdAt: new Date('2026-01-01T00:00:00.000Z'),
                        createdBy: 'user-bramble',
                    },
                ]
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble'], 'user-bramble');
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                mfaService.createInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
            expect(mfaService.createInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
        });

        it('runs every write on one transaction in sign-up order', async () => {
            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(
                termPolicyAcceptanceService.assertRequiredPublished
            ).toHaveBeenCalledWith([
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, []);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledWith(tx, 'user-bramble', inviteContext);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);

            expect(
                termPolicyAcceptanceService.assertRequiredPublished
            ).toHaveBeenCalledBefore(databaseService.withTransaction);
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                workspaceService.createOwnedForUsersInTx
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteService.acceptOnSignUpInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(userSocialService.linkInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberService.createInTx);
            expect(notificationQueue.notify).toHaveBeenCalledWith(
                EnumNotificationKind.welcomeSocial,
                { userId: 'user-bramble', proceedBy: 'user-bramble' }
            );
            expect(activityLogQueue.recordEffect).toHaveBeenNthCalledWith(
                1,
                requestContext,
                apiKeyContext,
                null,
                null,
                stageInput
            );
            expect(outboxService.addManyInTx).toHaveBeenCalledWith(tx, [
                welcomeSocialEffect,
                entryEffect,
                entryEffect,
                entryEffect,
            ]);
            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledBefore(outboxService.addManyInTx);
            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
            expect(
                userAuthService.createTokenAndSessionInTx
            ).toHaveBeenCalledWith(
                tx,
                requestContext,
                apiKeyContext,
                committedUser,
                upserted,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.socialGoogle,
                now
            );
            expect(deviceService.upsertForLoginInTx).toHaveBeenCalledWith(
                tx,
                committedUser.id,
                deviceIdentity,
                now
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('accepts the term policy alone, then starts the link and the project membership together, then the welcome and the session', async () => {
            const acceptance = buildDeferred<void>();
            const link = buildDeferred<void>();
            termPolicyAcceptanceService.acceptPublishedManyInTx.mockReturnValue(
                acceptance.promise
            );
            userSocialService.linkInTx.mockReturnValue(link.promise);

            const running = useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );
            await vi.advanceTimersByTimeAsync(0);

            expect(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);
            expect(userSocialService.linkInTx).not.toHaveBeenCalled();
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();

            acceptance.resolve();
            await vi.advanceTimersByTimeAsync(0);

            expect(userSocialService.linkInTx).toHaveBeenCalledTimes(1);
            expect(projectMemberService.createInTx).toHaveBeenCalledWith(
                tx,
                'project-bramble',
                'user-bramble',
                EnumProjectMemberRole.admin,
                'user-bramble'
            );
            expect(outboxService.addManyInTx).not.toHaveBeenCalled();
            expect(
                userAuthService.createTokenAndSessionInTx
            ).not.toHaveBeenCalled();

            link.resolve();
            await running;

            expect(outboxService.addManyInTx).toHaveBeenCalledBefore(
                userAuthService.createTokenAndSessionInTx
            );
        });

        it('returns the created user with the session tokens', async () => {
            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).resolves.toEqual({ user: committedUser, tokens });
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            userRegistrationService.buildSocialCreate.mockReturnValue({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRole: null,
                },
            });

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            userRegistrationService.buildSocialCreate.mockReturnValue({
                ...input,
                password: null,
                passwordHistoryType: null,
                verification: null,
            });

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...social, inviteToken: null },
                now,
                'subject-bramble'
            );

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceService.assertRequiredPublished
            ).toHaveBeenCalledTimes(1);
        });

        it('calls the role, username, country, and term policy checks while the invite read is still pending', async () => {
            const inviteRead = buildDeferred<typeof invite>();
            workspaceInviteService.getSignUpInvite.mockReturnValue(
                inviteRead.promise
            );

            const running = useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(roleService.getByName).toHaveBeenCalled();
            expect(userService.checkUsername).toHaveBeenCalledWith(
                'bramble2fox'
            );
            expect(countryService.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(
                termPolicyAcceptanceService.assertRequiredPublished
            ).toHaveBeenCalled();

            inviteRead.resolve(invite);
            await running;
        });

        it('opens no transaction when a required term policy is not published', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceService.assertRequiredPublished.mockRejectedValue(
                failure
            );

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toBe(failure);
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
            expect(userService.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            userRegistrationService.buildSocialCreate.mockReturnValue(input);
            const collision = buildPrismaKnownRequestError('P2002', 'slug');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);

            await useCase['signUpWithSocial'](
                requestContext,
                apiKeyContext,
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                social,
                now,
                'subject-bramble'
            );

            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenLastCalledWith(tx, [
                {
                    userId: 'user-bramble',
                    workspaceId: 'workspace-bramble',
                    name: "bramble2fox's Workspace",
                    slug: 'w-bramble-b',
                },
            ]);
        });

        it('throws DatabaseUniqueValueGenerationFailedException when every slug candidate collides', async () => {
            userRegistrationService.buildSocialCreate.mockReturnValue(input);
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'slug')
            );

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the create util maps a non-slug collision to', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError('P2002', 'email')
            );

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
            });
        });

        it('maps a write conflict on the invite path to WorkspaceInviteAlreadyProcessedException', async () => {
            databaseService.withTransaction.mockRejectedValue(
                buildPrismaKnownRequestError(DatabaseWriteConflictCode)
            );

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteAlreadyProcessed,
            });
        });

        it('wraps a write conflict on the personal path in the unknown exception', async () => {
            const conflict = buildPrismaKnownRequestError(
                DatabaseWriteConflictCode
            );
            userRegistrationService.buildSocialCreate.mockReturnValue(input);
            databaseService.withTransaction.mockRejectedValue(conflict);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: conflict,
            });
        });

        it('wraps a non-collision error the create util leaves unmapped in the unknown exception', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);

            await expect(
                useCase['signUpWithSocial'](
                    requestContext,
                    apiKeyContext,
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    social,
                    now,
                    'subject-bramble'
                )
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
