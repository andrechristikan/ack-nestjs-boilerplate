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
import { ActivityLogService } from '@modules/activity-log/services/activity-log.service';
import type { IActivityLogStaged } from '@modules/activity-log/interfaces/activity-log.interface';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { CountryService } from '@modules/country/services/country.service';
import { CountryNotFoundException } from '@modules/country/exceptions/country.not-found.exception';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationService } from '@modules/notification/services/notification.service';
import { EnumNotificationKind } from '@modules/notification/enums/notification.enum';
import type {
    INotificationRecipient,
    INotificationVerificationEmailPayload,
} from '@modules/notification/interfaces/notification.interface';
import { NotificationQueue } from '@modules/notification/queues/notification.queue';
import { NotificationUtil } from '@modules/notification/utils/notification.util';
import { PasswordHistoryService } from '@modules/password-history/services/password-history.service';
import type { IPasswordHistoryCreate } from '@modules/password-history/interfaces/password-history.interface';
import { ProjectMemberService } from '@modules/project/services/project.member.service';
import { RoleService } from '@modules/role/services/role.service';
import { RoleNotFoundException } from '@modules/role/exceptions/role.not-found.exception';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import type { IRole } from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceService } from '@modules/term-policy/services/term-policy.acceptance.service';
import type { ITermPolicyAcceptanceCreate } from '@modules/term-policy/interfaces/term-policy.interface';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthService } from '@modules/user/services/user.auth.service';
import { UserService } from '@modules/user/services/user.service';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import { EnumUserSignUpWorkspaceContextType } from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateWithWorkspaceInput,
    IUserSignUp,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserCreateContract } from '@modules/user/contracts/user.create.contract';
import { UserCreateUtil } from '@modules/user/utils/user.create.util';
import { UserVerificationUtil } from '@modules/user/utils/user.verification.util';
import { WorkspaceService } from '@modules/workspace/services/workspace.service';
import { WorkspaceInviteService } from '@modules/workspace/services/workspace.invite.service';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';
import { TestRecipient } from '@test/unit/helpers/test.unit.notification-push.helper';
import { EnumWorkspaceStatusCodeError } from '@modules/workspace/enums/workspace.status-code.enum';
import { EnumUserStatusCodeError } from '@modules/user/enums/user.status-code.enum';
import { EnumFeatureFlagStatusCodeError } from '@modules/feature-flag/enums/feature-flag.status-code.enum';
import { UserSignUpUseCase } from '@modules/user/use-cases/user.sign-up.use-case';

describe('UserSignUpUseCase', () => {
    const userAuthService: MockProxy<UserAuthService> = mock<UserAuthService>();
    const userService: MockProxy<UserService> = mock<UserService>();
    const userCreateUtil: MockProxy<UserCreateUtil> = mock<UserCreateUtil>();
    const userVerificationUtil: MockProxy<UserVerificationUtil> =
        mock<UserVerificationUtil>();
    const passwordHistoryService: MockProxy<PasswordHistoryService> =
        mock<PasswordHistoryService>();
    const notificationService: MockProxy<NotificationService> =
        mock<NotificationService>();
    const notificationQueue: MockProxy<NotificationQueue> =
        mock<NotificationQueue>();
    const notificationUtil: MockProxy<NotificationUtil> =
        mock<NotificationUtil>();
    const termPolicyAcceptanceService: MockProxy<TermPolicyAcceptanceService> =
        mock<TermPolicyAcceptanceService>();
    const workspaceService: MockProxy<WorkspaceService> =
        mock<WorkspaceService>();
    const workspaceInviteService: MockProxy<WorkspaceInviteService> =
        mock<WorkspaceInviteService>();
    const workspaceUtil: MockProxy<WorkspaceUtil> = mock<WorkspaceUtil>();
    const projectMemberService: MockProxy<ProjectMemberService> =
        mock<ProjectMemberService>();
    const roleService: MockProxy<RoleService> = mock<RoleService>();
    const countryService: MockProxy<CountryService> = mock<CountryService>();
    const activityLogService: MockProxy<ActivityLogService> =
        mock<ActivityLogService>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    let useCase: UserSignUpUseCase;

    const tx = {} as IDatabaseTransactionClient;
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
        verifiedAt: null,
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
    const welcomePayload: INotificationVerificationEmailPayload = {
        link: 'https://example.com/verify?token=raw-token',
        expiredAt: '2026-03-05T07:00:00.000+07:00',
        expiredInMinutes: 15,
        reference: 'VRF-bramble',
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
        activityLogService.prepare.mockReturnValue(activityLog);
        notificationUtil.mapRecipient.mockReturnValue(recipient);
        userService.createManyInTx.mockResolvedValue([committedUser]);
        userCreateUtil.buildPasswordHistoryEntries.mockReturnValue([
            historyEntry,
        ]);
        userCreateUtil.buildTermPolicyAcceptanceEntries.mockReturnValue([
            acceptanceEntry,
        ]);
        userCreateUtil.buildUserIds.mockReturnValue(['user-bramble']);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleService.getByName.mockResolvedValue(role);
        countryService.getOne.mockResolvedValue(country);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSignUpUseCase,
                { provide: UserAuthService, useValue: userAuthService },
                { provide: UserService, useValue: userService },
                {
                    provide: PasswordHistoryService,
                    useValue: passwordHistoryService,
                },
                { provide: NotificationService, useValue: notificationService },
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
                    provide: ProjectMemberService,
                    useValue: projectMemberService,
                },
                { provide: RoleService, useValue: roleService },
                { provide: CountryService, useValue: countryService },
                { provide: ActivityLogService, useValue: activityLogService },
                { provide: NotificationQueue, useValue: notificationQueue },
                { provide: NotificationUtil, useValue: notificationUtil },
                { provide: UserCreateUtil, useValue: userCreateUtil },
                {
                    provide: UserVerificationUtil,
                    useValue: userVerificationUtil,
                },
                { provide: WorkspaceUtil, useValue: workspaceUtil },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        useCase = module.get(UserSignUpUseCase);
    });

    describe('execute', () => {
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
            workspaceInviteService.getSignUpInvite.mockResolvedValue(null);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                personalContext
            );
            userAuthService.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userService.existsByEmail.mockResolvedValue(false);
            userService.checkUsername.mockResolvedValue(clearUsername);
            userCreateUtil.buildStages.mockReturnValue([stageInput]);
            userVerificationUtil.mapEmailPayload.mockReturnValue(
                welcomePayload
            );
        });

        it('commits the new user on one transaction, stages the created rows, sends the welcome, and returns an empty envelope', async () => {
            await expect(useCase.execute(dto)).resolves.toEqual({});

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                null,
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(null, 'bramble2fox');
            expect(roleService.getByName).toHaveBeenCalledWith('user');
            expect(countryService.getOne).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(userAuthService.prepareSignUp).toHaveBeenCalledWith(
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
            expect(activityLogService.prepare).toHaveBeenCalledWith(stageInput);
            expect(activityLogService.stagePrepared).toHaveBeenCalledWith([
                activityLog,
            ]);
            expect(notificationUtil.mapRecipient).toHaveBeenCalledWith(
                committedUser,
                EnumNotificationKind.welcome,
                [],
                []
            );
            expect(userVerificationUtil.mapEmailPayload).toHaveBeenCalledWith(
                emailVerification
            );
            expect(notificationQueue.sendWelcome).toHaveBeenCalledWith(
                recipient,
                welcomePayload
            );
        });

        it('stages the created rows before the welcome enqueue', async () => {
            const callOrder: string[] = [];
            activityLogService.stagePrepared.mockImplementation(() => {
                callOrder.push('stagePrepared');
            });
            notificationQueue.sendWelcome.mockImplementation(async () => {
                callOrder.push('sendWelcome');
            });

            await useCase.execute(dto);

            expect(callOrder).toEqual(['stagePrepared', 'sendWelcome']);
        });

        it('forwards the name and reads the invite before the role when a token is present', async () => {
            workspaceInviteService.getSignUpInvite.mockResolvedValue(invite);
            userCreateUtil.buildSignUpWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await useCase.execute({
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'raw-token',
            });

            expect(workspaceInviteService.getSignUpInvite).toHaveBeenCalledWith(
                'raw-token',
                'bramble@example.com'
            );
            expect(
                userCreateUtil.buildSignUpWorkspaceContext
            ).toHaveBeenCalledWith(invite, 'bramble2fox');
            expect(userAuthService.prepareSignUp).toHaveBeenCalledWith(
                {
                    ...signUpInput,
                    name: 'Bramble Fox',
                    inviteToken: 'raw-token',
                },
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('throws the disabled exception before any read when invitations are closed', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                useCase.execute({ ...dto, inviteToken: 'raw-token' })
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
            expect(roleService.getByName).not.toHaveBeenCalled();
        });

        it('throws the invite exception before the role read when the invite does not resolve', async () => {
            workspaceInviteService.getSignUpInvite.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                useCase.execute({ ...dto, inviteToken: 'raw-token' })
            ).rejects.toMatchObject({
                module: 'workspace',
                statusCode: EnumWorkspaceStatusCodeError.inviteInvalid,
                statusCodeKey:
                    EnumWorkspaceStatusCodeError[
                        EnumWorkspaceStatusCodeError.inviteInvalid
                    ],
                messagePath: 'workspace.error.inviteInvalid',
            });
            expect(roleService.getByName).not.toHaveBeenCalled();
        });

        it('answers the role gate before the email and username gates', async () => {
            roleService.getByName.mockRejectedValue(
                new RoleNotFoundException()
            );
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(userService.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userAuthService.prepareSignUp).not.toHaveBeenCalled();
        });

        it('answers the country gate before the email and username gates', async () => {
            countryService.getOne.mockRejectedValue(
                new CountryNotFoundException()
            );
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                messagePath: 'country.error.notFound',
            });
            expect(userService.assertEmailAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate and opens no transaction', async () => {
            userService.existsByEmail.mockResolvedValue(true);
            userService.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.emailExist,
                statusCodeKey:
                    EnumUserStatusCodeError[EnumUserStatusCodeError.emailExist],
                messagePath: 'user.error.emailExist',
            });
            expect(userService.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userService.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the username gate rejects', async () => {
            userService.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(useCase.execute(dto)).rejects.toMatchObject({
                module: 'user',
                statusCode: EnumUserStatusCodeError.usernameExist,
                statusCodeKey:
                    EnumUserStatusCodeError[
                        EnumUserStatusCodeError.usernameExist
                    ],
                messagePath: 'user.error.usernameExist',
            });
            expect(userService.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('stages and enqueues nothing when the commit throws', async () => {
            const failure = new UserEmailExistException();
            databaseService.withTransaction.mockRejectedValue(failure);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(useCase.execute(dto)).rejects.toBe(failure);
            expect(activityLogService.stagePrepared).not.toHaveBeenCalled();
            expect(notificationQueue.sendWelcome).not.toHaveBeenCalled();
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

            const created = await useCase['createSignUpUser'](inviteInput);

            expect(created).toEqual(committedUser);
            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userService.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(passwordHistoryService.createManyInTx).toHaveBeenCalledWith(
                tx,
                [historyEntry]
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledWith(tx, ['user-bramble']);
            expect(workspaceUtil.buildOwnedUsers).toHaveBeenCalledWith(
                [inviteInput],
                0
            );
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [owned]);
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
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledBefore(userService.createManyInTx);
            expect(userService.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryService.createManyInTx
            );
            expect(
                passwordHistoryService.createManyInTx
            ).toHaveBeenCalledBefore(
                notificationService.createDefaultsManyInTx
            );
            expect(
                notificationService.createDefaultsManyInTx
            ).toHaveBeenCalledBefore(workspaceService.createOwnedForUsersInTx);
            expect(
                workspaceService.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteService.acceptOnSignUpInTx);
            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberService.createInTx);
            expect(projectMemberService.createInTx).toHaveBeenCalledBefore(
                termPolicyAcceptanceService.acceptPublishedManyInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            await useCase['createSignUpUser']({
                ...inviteInput,
                workspaceContext: {
                    ...inviteContext,
                    projectId: null,
                    projectMemberRole: null,
                },
            });

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberService.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite for a personal input', async () => {
            await useCase['createSignUpUser'](input);

            expect(
                workspaceInviteService.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceService.assertRequiredPublishedInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('inserts nothing when a required term policy is not published', async () => {
            const failure = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceService.assertRequiredPublishedInTx.mockRejectedValue(
                failure
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userCreateUtil.mapCreateCollision.mockReturnValue(failure);

            await expect(useCase['createSignUpUser'](input)).rejects.toBe(
                failure
            );
            expect(userService.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx) as never);
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const created = await useCase['createSignUpUser'](input);

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
                useCase['createSignUpUser'](input)
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

            await expect(useCase['createSignUpUser'](input)).rejects.toBe(
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
                useCase['createSignUpUser'](input)
            ).rejects.toMatchObject({
                module: 'app',
                statusCode: EnumAppStatusCodeError.unknown,
                rawError: otherError,
            });
        });
    });
});
