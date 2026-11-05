import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumActivityLogAction,
    EnumPasswordHistoryType,
    EnumProjectMemberRole,
    EnumRoleType,
    EnumTermPolicyType,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumVerificationType,
    EnumWorkspaceInviteStatus,
    EnumWorkspaceMemberRole,
} from '@generated/prisma-client/client';
import type {
    Country,
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import { ActivityLogDomain } from '@modules/activity-log/domains/activity-log.domain';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
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
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import type { UserCreateRequestDto } from '@modules/user/dtos/request/user.create.request.dto';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportUsernameChecks,
    IUserSignUp,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserRegistrationHttpService } from '@modules/user/services/http/user.registration.http.service';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';

describe('UserRegistrationHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
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
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const projectMemberDomain: MockProxy<ProjectMemberDomain> =
        mock<ProjectMemberDomain>();
    const roleDomain: MockProxy<RoleDomain> = mock<RoleDomain>();
    const countryDomain: MockProxy<CountryDomain> = mock<CountryDomain>();
    const activityLogDomain: MockProxy<ActivityLogDomain> =
        mock<ActivityLogDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();

    let service: UserRegistrationHttpService;

    const tx = {} as IDatabaseTransactionClient;
    const now = new Date('2026-03-01T00:00:00.000Z');
    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.create.timeoutInMs': 5000,
        'user.create.bulkTimeoutInMs': 30000,
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
    const committedUser: IUser = { ...baseUser, twoFactor };
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
    const emailVerification: IUserVerificationEmailCreate = {
        type: 'email',
        expiredAt: new Date('2026-03-05T00:00:00.000Z'),
        expiredInMinutes: 15,
        resendInMinutes: 5,
        reference: 'VRF-bramble',
        token: 'raw-token',
        hashedToken: 'hashed-token',
        link: 'https://example.com/verify?token=raw-token',
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
        activityLogDomain.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRegistrationHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: UserImportDomain, useValue: userImportDomain },
                { provide: UserCreateUtil, useValue: userCreateUtil },
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
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: ProjectMemberDomain, useValue: projectMemberDomain },
                { provide: RoleDomain, useValue: roleDomain },
                { provide: CountryDomain, useValue: countryDomain },
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
        service = module.get(UserRegistrationHttpService);
    });

    describe('signUp', () => {
        const dto: UserSignUpRequestDto = {
            username: 'bramble2fox',
            countryId: 'country-bramble',
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plainPassword123!',
            marketing: true,
            cookies: true,
            from: EnumUserSignUpFrom.website,
        };
        const signUpInput: IUserSignUp = {
            username: 'bramble2fox',
            email: 'bramble@example.com',
            name: null,
            countryId: 'country-bramble',
            password: 'plainPassword123!',
            from: EnumUserSignUpFrom.website,
            cookies: true,
            marketing: true,
            inviteToken: null,
        };

        beforeEach(() => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(null);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
        });

        it('commits the new user on one transaction, stages the created rows, sends the welcome, and returns an empty envelope', async () => {
            await expect(service.signUp(dto)).resolves.toEqual({});

            expect(workspaceInviteDomain.getSignUpInvite).toHaveBeenCalledWith(
                null,
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(null, 'bramble2fox');
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                signUpInput,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(userCreateUtil.buildStages).toHaveBeenCalledWith(
                UserCreateContract.signUp,
                [input],
                [committedUser]
            );
            expect(activityLogDomain.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcome,
                [],
                []
            );
            expect(notificationQueue.sendWelcome).toHaveBeenCalledWith(
                recipient,
                {
                    expiredAt: '2026-03-05T00:00:00.000Z',
                    reference: 'VRF-bramble',
                    link: 'https://example.com/verify?token=raw-token',
                    expiredInMinutes: 15,
                }
            );
        });

        it('stages the created rows before the welcome enqueue', async () => {
            const callOrder: string[] = [];
            activityLogDomain.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendWelcome.mockImplementation(async () => {
                callOrder.push('sendWelcome');
            });

            await service.signUp(dto);

            expect(callOrder).toEqual(['stagePrepared', 'sendWelcome']);
        });

        it('forwards the name and reads the invite before the role when a token is present', async () => {
            workspaceInviteDomain.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await service.signUp({
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'raw-token',
            });

            expect(workspaceInviteDomain.getSignUpInvite).toHaveBeenCalledWith(
                'raw-token',
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(invite, 'bramble2fox');
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                {
                    ...signUpInput,
                    name: 'Bramble Fox',
                    inviteToken: 'raw-token',
                },
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('throws the disabled exception before any read when invitations are closed', async () => {
            workspaceInviteDomain.getSignUpInvite.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                service.signUp({ ...dto, inviteToken: 'raw-token' })
            ).rejects.toMatchObject({
                module: 'featureFlag',
                statusCode: EnumFeatureFlagStatusCodeError.disabled,
                statusCodeKey:
                    EnumFeatureFlagStatusCodeError[
                        EnumFeatureFlagStatusCodeError.disabled
                    ],
                messagePath: 'featureFlag.error.disabled',
            });
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).not.toHaveBeenCalled();
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('throws the invite exception before the role read when the invite does not resolve', async () => {
            workspaceInviteDomain.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                service.signUp({ ...dto, inviteToken: 'raw-token' })
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('answers the role gate before the email and username gates', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userAuthDomain.prepareSignUp).not.toHaveBeenCalled();
        });

        it('answers the country gate before the email and username gates', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                messagePath: 'country.error.notFound',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate and opens no transaction', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(userDomain.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the username gate rejects', async () => {
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(service.signUp(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
            expect(userDomain.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('stages and enqueues nothing when the commit throws', async () => {
            const failure = new UserEmailExistException();
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(service.signUp(dto)).rejects.toBe(failure);
            expect(activityLogDomain.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcome).not.toHaveBeenCalled();
        });
    });

    describe('createByAdmin', () => {
        const dto: UserCreateRequestDto = {
            username: 'bramble2fox',
            email: 'bramble@example.com' as Lowercase<string>,
            roleId: 'role-bramble',
            countryId: 'country-bramble',
        };
        const actor: IUser = {
            ...baseUser,
            id: 'admin-bramble',
            role: { ...baseUser.role, type: EnumRoleType.admin },
            roleId: 'role-actor-bramble',
        };

        beforeEach(() => {
            roleDomain.getById.mockResolvedValue(role);
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input,
                passwordString: 'random-password',
            });
            userCreateUtil.buildCreateByAdminStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('commits once without the policy assertion, stages the rows, and sends the welcome with the generated password', async () => {
            await expect(service.createByAdmin(dto, actor)).resolves.toEqual({
                data: { id: 'user-bramble' },
            });

            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userDomain.prepareCreateByAdmin).toHaveBeenCalledWith(
                {
                    username: 'bramble2fox',
                    email: 'bramble@example.com',
                    name: null,
                    roleId: 'role-bramble',
                    countryId: 'country-bramble',
                },
                'admin-bramble',
                role
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
            expect(
                userCreateUtil.buildCreateByAdminStages
            ).toHaveBeenCalledWith(input, committedUser);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcomeByAdmin,
                [],
                []
            );
            expect(notificationQueue.sendWelcomeByAdmin).toHaveBeenCalledWith(
                recipient,
                {
                    password: 'random-password',
                    passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                    passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                },
                'admin-bramble'
            );
        });

        it('sends no welcome when the created account carries no password', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: { ...input, password: null, passwordHistoryType: null },
                passwordString: 'random-password',
            });

            await service.createByAdmin(dto, actor);

            expect(notificationQueue.sendWelcomeByAdmin).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before the rank and identity gates when the role is missing', async () => {
            roleDomain.getById.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(roleDomain.assertActorOutranks).not.toHaveBeenCalled();
            expect(countryDomain.getOne).not.toHaveBeenCalled();
            expect(userDomain.existsByEmail).not.toHaveBeenCalled();
            expect(userDomain.checkUsername).not.toHaveBeenCalled();
        });

        it('throws the rank exception before any country or identity read', async () => {
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new RoleRankForbiddenException();
            });

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(countryDomain.getOne).not.toHaveBeenCalled();
            expect(userDomain.existsByEmail).not.toHaveBeenCalled();
            expect(userDomain.checkUsername).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before the identity gates', async () => {
            countryDomain.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                service.createByAdmin(dto, actor)
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });
    });

    describe('importByAdmin', () => {
        const rows: UserImportRequestDto[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com' as Lowercase<string>,
            },
        ];
        const imported: IUserImport[] = [
            {
                username: 'bramble2fox',
                email: 'bramble@example.com',
                name: null,
            },
        ];
        const usernameChecks: IUserImportUsernameChecks = {
            existing: [],
            badWords: [false],
        };

        beforeEach(() => {
            countryDomain.getIdByAlpha2Code.mockResolvedValue(
                'country-bramble'
            );
            userImportDomain.getExistingEmails.mockResolvedValue([]);
            userImportDomain.getUsernameChecks.mockResolvedValue(
                usernameChecks
            );
            userImportDomain.prepareImportByAdmin.mockResolvedValue({
                inputs: [input],
                passwordHasheds: [password],
                passwordStrings: ['random-password'],
            });
            userCreateUtil.buildImportByAdminStages.mockReturnValue([
                stageInput,
            ]);
        });

        it('checks the emails, prepares, commits in bulk with the bulk timeout, stages the rows, and enqueues the welcomes', async () => {
            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).resolves.toEqual({});

            expect(userImportDomain.getExistingEmails).toHaveBeenCalledWith([
                'bramble@example.com',
            ]);
            expect(userImportDomain.getUsernameChecks).toHaveBeenCalledWith([
                'bramble2fox',
            ]);
            expect(userImportDomain.assertEmailsAvailable).toHaveBeenCalledWith(
                []
            );
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportDomain.prepareImportByAdmin).toHaveBeenCalledWith(
                imported,
                'admin-bramble',
                role,
                'country-bramble',
                usernameChecks
            );
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
            expect(
                userCreateUtil.buildImportByAdminStages
            ).toHaveBeenCalledWith([input], [committedUser]);
            expect(activityLogDomain.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(
                notificationQueue.sendWelcomeByAdminBulk
            ).toHaveBeenCalledWith(
                [
                    {
                        recipient,
                        data: {
                            password: 'random-password',
                            passwordCreatedAt: '2026-03-05T00:00:00.000Z',
                            passwordExpiredAt: '2026-03-05T00:00:00.000Z',
                        },
                    },
                ],
                'admin-bramble'
            );
        });

        it('throws the email error before reading the default role', async () => {
            userImportDomain.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportDomain.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
            });
            expect(roleDomain.getByName).not.toHaveBeenCalled();
            expect(countryDomain.getIdByAlpha2Code).not.toHaveBeenCalled();
        });

        it('reads the default role before the default country', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());
            countryDomain.getIdByAlpha2Code.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({ module: 'role' });
            expect(countryDomain.getIdByAlpha2Code).not.toHaveBeenCalled();
        });

        it('throws the import email exception before the role and country gates', async () => {
            userImportDomain.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportDomain.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.importEmailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.importEmailExist
                    ],
                messagePath: 'user.error.importEmailExist',
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockRejectedValue(new RoleNotFoundException());

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before preparing when the default country is missing', async () => {
            countryDomain.getIdByAlpha2Code.mockRejectedValue(
                new CountryNotFoundException()
            );

            await expect(
                service.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('createSignUpUser', () => {
        it('runs every write on one transaction in sign-up order', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-invite',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const created = await service['createSignUpUser'](inviteInput);

            expect(created).toEqual(committedUser);
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
            await service['createSignUpUser']({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRole: null,
                },
            });

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            await service['createSignUpUser'](input);

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

            await expect(service['createSignUpUser'](input)).rejects.toBe(
                failure
            );
            expect(userDomain.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const created = await service['createSignUpUser'](input);

            expect(created).toEqual(committedUser);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
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
                service['createSignUpUser'](input)
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

            await expect(service['createSignUpUser'](input)).rejects.toBe(
                mapped
            );
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
                service['createSignUpUser'](input)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });

    describe('createAdminUsers', () => {
        it('runs the writes on one transaction in order without the published assertion', async () => {
            const owned = {
                userId: 'user-bramble',
                workspaceId: 'workspace-bramble',
                name: 'Bramble',
                slug: 'w-bramble',
            };
            workspaceUtil.buildOwnedUsers.mockReturnValue([owned]);

            const users = await service['createAdminUsers']([input], 7000);

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 7000 }
            );
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
            expect(userDomain.createManyInTx).toHaveBeenCalledWith(tx, [input]);
            expect(passwordHistoryDomain.createManyInTx).toHaveBeenCalledWith(
                tx,
                [historyEntry]
            );
            expect(
                notificationDomain.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble']);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
                0
            );
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
            expect(
                termPolicyAcceptanceDomain.acceptPublishedManyInTx
            ).toHaveBeenCalledWith(tx, [acceptanceEntry]);
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
            ).toHaveBeenCalledBefore(
                termPolicyAcceptanceDomain.acceptPublishedManyInTx
            );
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const users = await service['createAdminUsers']([input], 5000);

            expect(users).toEqual([committedUser]);
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [input],
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
                service['createAdminUsers']([input], 5000)
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
                service['createAdminUsers']([input], 5000)
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
                service['createAdminUsers']([input], 5000)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
