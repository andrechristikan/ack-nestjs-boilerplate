import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { EnumDatabaseStatusCodeError } from '@common/database/enums/database.status-code.enum';
import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
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
    TwoFactor,
    WorkspaceInvite,
} from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { CountryDomain } from '@modules/country/domains/country.domain';
import { EnumCountryStatusCodeError } from '@modules/country/enums/country.status-code.enum';
import { FeatureFlagDomain } from '@modules/feature-flag/domains/feature-flag.domain';
import { FeatureFlagDisabledException } from '@modules/feature-flag/exceptions/feature-flag.disabled.exception';
import { NotificationDomain } from '@modules/notification/domains/notification.domain';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { PasswordHistoryDomain } from '@modules/password-history/domains/password-history.domain';
import { ProjectMemberDomain } from '@modules/project/domains/project.member.domain';
import { RoleDomain } from '@modules/role/domains/role.domain';
import { EnumRoleStatusCodeError } from '@modules/role/enums/role.status-code.enum';
import { RoleRankForbiddenException } from '@modules/role/exceptions/role.rank-forbidden.exception';
import type {
    IRole,
    IRoleActor,
} from '@modules/role/interfaces/role.interface';
import { TermPolicyAcceptanceDomain } from '@modules/term-policy/domains/term-policy.acceptance.domain';
import { TermPolicyRequiredNotPublishedException } from '@modules/term-policy/exceptions/term-policy.required-not-published.exception';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserTwoFactorDomain } from '@modules/user/domains/user.two-factor.domain';
import { UserVerificationDomain } from '@modules/user/domains/user.verification.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { UserEmailExistException } from '@modules/user/exceptions/user.email-exist.exception';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserImportEmailExistException } from '@modules/user/exceptions/user.import-email-exist.exception';
import type {
    IUser,
    IUserCheckUsername,
    IUserCreateByAdmin,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserImportUsernameChecks,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpWorkspaceInvite,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserOnboardingUtil } from '@modules/user/utils/user.onboarding.util';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceInviteInvalidException } from '@modules/workspace/exceptions/workspace.invite-invalid.exception';
import { WorkspaceUtil } from '@modules/workspace/utils/workspace.util';
import { ConfigService } from '@nestjs/config';
import { buildConfigService } from '@test/unit/helpers/test.unit.config.helper';

describe('OnboardingDomain', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userOnboardingUtil: MockProxy<UserOnboardingUtil> =
        mock<UserOnboardingUtil>();
    const userVerificationDomain: MockProxy<UserVerificationDomain> =
        mock<UserVerificationDomain>();
    const userTwoFactorDomain: MockProxy<UserTwoFactorDomain> =
        mock<UserTwoFactorDomain>();
    const passwordHistoryDomain: MockProxy<PasswordHistoryDomain> =
        mock<PasswordHistoryDomain>();
    const notificationDomain: MockProxy<NotificationDomain> =
        mock<NotificationDomain>();
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
    const featureFlagDomain: MockProxy<FeatureFlagDomain> =
        mock<FeatureFlagDomain>();
    const databaseService: MockProxy<DatabaseService> = mock<DatabaseService>();
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();

    const tx: IDatabaseTransactionClient = mock<IDatabaseTransactionClient>();

    let domain: OnboardingDomain;

    const configValues: Record<string, unknown> = {
        'user.default.role': 'user',
        'user.default.country': 'ID',
        'user.onboarding.createTimeoutInMs': 5000,
        'user.onboarding.createBulkTimeoutInMs': 30000,
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
    const twoFactor: TwoFactor = {
        id: 'two-factor-bramble',
        userId: 'user-bramble',
        secret: null,
        pendingSecret: null,
        backupCodes: [],
        enabled: false,
        requiredSetup: false,
        confirmedAt: null,
        lastUsedAt: null,
        attempt: 0,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
    };
    const createdUser: IUser = {
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
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    };
    const committedUser: IUser = { ...createdUser, twoFactor };
    const clearUsername: IUserCheckUsername = {
        badWord: false,
        exist: false,
        pattern: false,
    };
    const role: IRole = {
        id: 'role-bramble',
        name: 'user',
        type: EnumRoleType.user,
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
    };

    beforeEach(async () => {
        vi.resetAllMocks();

        databaseService.withTransaction.mockImplementation(async fn => fn(tx));
        userDomain.createManyInTx.mockResolvedValue([createdUser]);
        userTwoFactorDomain.createDisabledInTx.mockResolvedValue(twoFactor);
        workspaceUtil.countSlugAttempts.mockReturnValue(2);
        workspaceUtil.buildOwnedUsers.mockReturnValue([]);
        roleDomain.getByName.mockResolvedValue(role);
        countryDomain.existsById.mockResolvedValue(true);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OnboardingDomain,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: UserImportDomain, useValue: userImportDomain },
                { provide: UserOnboardingUtil, useValue: userOnboardingUtil },
                {
                    provide: UserVerificationDomain,
                    useValue: userVerificationDomain,
                },
                {
                    provide: UserTwoFactorDomain,
                    useValue: userTwoFactorDomain,
                },
                {
                    provide: PasswordHistoryDomain,
                    useValue: passwordHistoryDomain,
                },
                { provide: NotificationDomain, useValue: notificationDomain },
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
                { provide: FeatureFlagDomain, useValue: featureFlagDomain },
                { provide: DatabaseService, useValue: databaseService },
                { provide: DatabaseUtil, useValue: databaseUtil },
                {
                    provide: ConfigService,
                    useValue: buildConfigService(configValues),
                },
            ],
        }).compile();
        domain = module.get(OnboardingDomain);
    });

    describe('signUp', () => {
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
            userOnboardingUtil.buildPersonalWorkspaceContexts.mockReturnValue([
                personalContext,
            ]);
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
        });

        it('reads the role, country, email, and username checks together', async () => {
            const deferredRole = Promise.withResolvers<IRole>();
            roleDomain.getByName.mockReturnValue(deferredRole.promise);
            userDomain.checkUsername.mockImplementation(async () => {
                deferredRole.resolve(role);

                return clearUsername;
            });

            await domain.signUp(signUpInput);

            expect(userDomain.existsByEmail).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userDomain.checkUsername).toHaveBeenCalledWith(
                'bramble2fox'
            );
        });

        it('answers the role gate before the email and username gates', async () => {
            roleDomain.getByName.mockResolvedValue(null);
            countryDomain.existsById.mockResolvedValue(false);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(domain.signUp(signUpInput)).rejects.toMatchObject({
                module: 'role',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
        });

        it('answers the country gate before the email and username gates', async () => {
            countryDomain.existsById.mockResolvedValue(false);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(domain.signUp(signUpInput)).rejects.toMatchObject({
                module: 'country',
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate and prepares nothing', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(domain.signUp(signUpInput)).rejects.toBeInstanceOf(
                UserEmailExistException
            );
            expect(userDomain.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(userAuthDomain.prepareSignUp).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('resolves the role and country, prepares, commits once, and returns the committed rows', async () => {
            const result = await domain.signUp(signUpInput);

            expect(
                userOnboardingUtil.buildPersonalWorkspaceContexts
            ).toHaveBeenCalledWith(['bramble2fox']);
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.existsById).toHaveBeenCalledWith(
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
            expect(result).toEqual({
                inputs: [input],
                users: [committedUser],
                emailVerification,
            });
        });

        it('reads the invitation gate, the pending invite, and shapes its workspace context when a token is present', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockResolvedValue(
                invite
            );
            userOnboardingUtil.buildInviteWorkspaceContext.mockReturnValue(
                inviteContext
            );

            await domain.signUp({ ...signUpInput, inviteToken: 'raw-token' });

            expect(
                featureFlagDomain.validateFeatureFlagMetadata
            ).toHaveBeenCalledWith('workspace', 'invitationAllowed');
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).toHaveBeenCalledWith('raw-token', 'bramble@example.com');
            expect(
                userOnboardingUtil.buildInviteWorkspaceContext
            ).toHaveBeenCalledWith(invite);
            expect(
                userOnboardingUtil.buildPersonalWorkspaceContexts
            ).not.toHaveBeenCalled();
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                { ...signUpInput, inviteToken: 'raw-token' },
                { roleId: 'role-bramble', workspaceContext: inviteContext }
            );
        });

        it('throws the disabled exception before any read when invitations are closed', async () => {
            featureFlagDomain.validateFeatureFlagMetadata.mockRejectedValue(
                new FeatureFlagDisabledException()
            );

            await expect(
                domain.signUp({ ...signUpInput, inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(FeatureFlagDisabledException);
            expect(
                workspaceInviteDomain.validateInviteForEmail
            ).not.toHaveBeenCalled();
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('throws the invite exception before the role read when the invite does not resolve', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );

            await expect(
                domain.signUp({ ...signUpInput, inviteToken: 'raw-token' })
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(roleDomain.getByName).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockResolvedValue(null);

            await expect(domain.signUp(signUpInput)).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(userAuthDomain.prepareSignUp).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before preparing when the country is missing', async () => {
            countryDomain.existsById.mockResolvedValue(false);

            await expect(domain.signUp(signUpInput)).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
                messagePath: 'country.error.notFound',
            });
            expect(userAuthDomain.prepareSignUp).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it('opens no transaction when the username gate rejects', async () => {
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(domain.signUp(signUpInput)).rejects.toBeInstanceOf(
                UserUsernameExistException
            );
            expect(userDomain.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });
    });

    describe('signUpWithSocial', () => {
        const loginSocial: IUserLoginSocial = {
            username: 'bramble2fox',
            name: 'Bramble Fox',
            countryId: 'country-bramble',
            from: EnumUserLoginFrom.website,
            device: {
                fingerprint: 'device-bramble',
                name: null,
                platform: null,
                notificationToken: null,
            },
            cookies: true,
            marketing: true,
            inviteToken: null,
        };

        beforeEach(() => {
            userOnboardingUtil.buildPersonalWorkspaceContexts.mockReturnValue([
                personalContext,
            ]);
            featureFlagDomain.getMetadataByKey.mockResolvedValue({
                signUpAllowed: true,
            });
            userAuthDomain.getOneByEmail.mockResolvedValue(null);
            userAuthDomain.prepareSocialCreate.mockReturnValue(input);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
        });

        it('reads the role, country, and username checks together after the gate', async () => {
            const deferredRole = Promise.withResolvers<IRole>();
            roleDomain.getByName.mockReturnValue(deferredRole.promise);
            userDomain.checkUsername.mockImplementation(async () => {
                deferredRole.resolve(role);

                return clearUsername;
            });

            await domain.signUpWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );

            expect(userDomain.checkUsername).toHaveBeenCalledWith(
                'bramble2fox'
            );
            expect(userDomain.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
        });

        it('answers the country gate before the username gate', async () => {
            countryDomain.existsById.mockResolvedValue(false);
            userDomain.assertUsernameAvailable.mockImplementation(() => {
                throw new UserUsernameExistException();
            });

            await expect(
                domain.signUpWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    loginSocial
                )
            ).rejects.toMatchObject({ module: 'country' });
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
        });

        it('commits the new user once and returns the rows', async () => {
            const result = await domain.signUpWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );

            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                'loginWithGoogle'
            );
            expect(userAuthDomain.prepareSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial,
                { roleId: 'role-bramble', workspaceContext: personalContext }
            );
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(result).toEqual({
                inputs: [input],
                users: [committedUser],
            });
        });

        it('reads the apple flag for an apple sign-in', async () => {
            await domain.signUpWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialApple,
                loginSocial
            );

            expect(featureFlagDomain.getMetadataByKey).toHaveBeenCalledWith(
                'loginWithApple'
            );
        });

        it('resolves the invite before the user-exists gate', async () => {
            workspaceInviteDomain.validateInviteForEmail.mockRejectedValue(
                new WorkspaceInviteInvalidException()
            );
            userAuthDomain.getOneByEmail.mockResolvedValue(createdUser);

            await expect(
                domain.signUpWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    { ...loginSocial, inviteToken: 'raw-token' }
                )
            ).rejects.toBeInstanceOf(WorkspaceInviteInvalidException);
            expect(featureFlagDomain.getMetadataByKey).not.toHaveBeenCalled();
        });

        it('returns null without reading the role when the user already exists', async () => {
            userAuthDomain.getOneByEmail.mockResolvedValue(createdUser);

            const result = await domain.signUpWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );

            expect(result).toBeNull();
            expect(roleDomain.getByName).not.toHaveBeenCalled();
            expect(userDomain.checkUsername).not.toHaveBeenCalled();
            expect(databaseService.withTransaction).not.toHaveBeenCalled();
        });

        it.each([null, { signUpAllowed: false }])(
            'returns null when the flag metadata is %j',
            async metadata => {
                featureFlagDomain.getMetadataByKey.mockResolvedValue(metadata);

                const result = await domain.signUpWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    loginSocial
                );

                expect(result).toBeNull();
                expect(roleDomain.getByName).not.toHaveBeenCalled();
                expect(
                    userAuthDomain.prepareSocialCreate
                ).not.toHaveBeenCalled();
            }
        );

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockResolvedValue(null);

            await expect(
                domain.signUpWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    loginSocial
                )
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(userAuthDomain.prepareSocialCreate).not.toHaveBeenCalled();
        });
    });

    describe('createByAdmin', () => {
        const create: IUserCreateByAdmin = {
            username: 'bramble2fox',
            email: 'bramble@example.com',
            name: null,
            roleId: 'role-bramble',
            countryId: 'country-bramble',
        };
        const actor: IRoleActor = {
            roleId: 'role-actor-bramble',
            roleType: EnumRoleType.admin,
        };

        beforeEach(() => {
            roleDomain.getById.mockResolvedValue(role);
            userDomain.existsByEmail.mockResolvedValue(false);
            userDomain.checkUsername.mockResolvedValue(clearUsername);
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input,
                passwordString: 'random-password',
            });
        });

        it('reads the role, country, email, and username checks together', async () => {
            const deferredRole = Promise.withResolvers<IRole>();
            roleDomain.getById.mockReturnValue(deferredRole.promise);
            userDomain.checkUsername.mockImplementation(async () => {
                deferredRole.resolve(role);

                return clearUsername;
            });

            await domain.createByAdmin(create, 'admin-bramble', actor);

            expect(userDomain.existsByEmail).toHaveBeenCalledWith(
                'bramble@example.com'
            );
            expect(userDomain.checkUsername).toHaveBeenCalledWith(
                'bramble2fox'
            );
        });

        it('throws RoleNotFoundException before the rank, country, and identity gates when the role is missing', async () => {
            roleDomain.getById.mockResolvedValue(null);

            await expect(
                domain.createByAdmin(create, 'admin-bramble', actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
                messagePath: 'role.error.notFound',
            });
            expect(roleDomain.assertActorOutranks).not.toHaveBeenCalled();
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('throws the rank exception before the country and identity gates when the actor does not outrank the role', async () => {
            countryDomain.existsById.mockResolvedValue(false);
            roleDomain.assertActorOutranks.mockImplementation(() => {
                throw new RoleRankForbiddenException();
            });

            await expect(
                domain.createByAdmin(create, 'admin-bramble', actor)
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.rankForbidden,
            });
            expect(roleDomain.assertActorOutranks).toHaveBeenCalledWith(
                EnumRoleType.admin,
                EnumRoleType.user
            );
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before the identity gates when the country is missing', async () => {
            countryDomain.existsById.mockResolvedValue(false);

            await expect(
                domain.createByAdmin(create, 'admin-bramble', actor)
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(userDomain.assertEmailAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('answers the email gate before the username gate', async () => {
            userDomain.existsByEmail.mockResolvedValue(true);
            userDomain.assertEmailAvailable.mockImplementation(() => {
                throw new UserEmailExistException();
            });

            await expect(
                domain.createByAdmin(create, 'admin-bramble', actor)
            ).rejects.toBeInstanceOf(UserEmailExistException);
            expect(userDomain.assertEmailAvailable).toHaveBeenCalledWith(true);
            expect(userDomain.assertUsernameAvailable).not.toHaveBeenCalled();
            expect(userDomain.prepareCreateByAdmin).not.toHaveBeenCalled();
        });

        it('prepares, commits once, and returns the rows with the generated password', async () => {
            const result = await domain.createByAdmin(
                create,
                'admin-bramble',
                actor
            );

            expect(countryDomain.existsById).toHaveBeenCalledWith(
                'country-bramble'
            );
            expect(userDomain.assertUsernameAvailable).toHaveBeenCalledWith(
                clearUsername
            );
            expect(userDomain.prepareCreateByAdmin).toHaveBeenCalledWith(
                create,
                'admin-bramble',
                role
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 5000 }
            );
            expect(result).toEqual({
                inputs: [input],
                users: [committedUser],
                passwordString: 'random-password',
            });
        });

        it('skips the required-policy assertion for an admin create', async () => {
            await domain.createByAdmin(create, 'admin-bramble', actor);

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
        });
    });

    describe('importByAdmin', () => {
        const rows: IUserImport[] = [
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
        });

        it('reads the emails, defaults, and username checks together', async () => {
            const deferredRole = Promise.withResolvers<IRole>();
            roleDomain.getByName.mockReturnValue(deferredRole.promise);
            userImportDomain.getUsernameChecks.mockImplementation(async () => {
                deferredRole.resolve(role);

                return usernameChecks;
            });

            await domain.importByAdmin(rows, 'admin-bramble');

            expect(userImportDomain.getExistingEmails).toHaveBeenCalledWith([
                'bramble@example.com',
            ]);
            expect(userImportDomain.getUsernameChecks).toHaveBeenCalledWith([
                'bramble2fox',
            ]);
        });

        it('checks the emails, reads the defaults, prepares, and commits in bulk with the bulk timeout', async () => {
            const result = await domain.importByAdmin(rows, 'admin-bramble');

            expect(userImportDomain.assertEmailsAvailable).toHaveBeenCalledWith(
                []
            );
            expect(roleDomain.getByName).toHaveBeenCalledWith('user');
            expect(countryDomain.getIdByAlpha2Code).toHaveBeenCalledWith('ID');
            expect(userImportDomain.prepareImportByAdmin).toHaveBeenCalledWith(
                rows,
                'admin-bramble',
                role,
                'country-bramble',
                usernameChecks
            );
            expect(databaseService.withTransaction).toHaveBeenCalledWith(
                expect.any(Function),
                { timeout: 30000 }
            );
            expect(result).toEqual({
                inputs: [input],
                users: [committedUser],
                passwordHasheds: [password],
                passwordStrings: ['random-password'],
            });
        });

        it('throws the import email exception before the role and country gates', async () => {
            roleDomain.getByName.mockResolvedValue(null);
            userImportDomain.getExistingEmails.mockResolvedValue([
                'bramble@example.com',
            ]);
            userImportDomain.assertEmailsAvailable.mockImplementation(() => {
                throw new UserImportEmailExistException('bramble@example.com');
            });

            await expect(
                domain.importByAdmin(rows, 'admin-bramble')
            ).rejects.toBeInstanceOf(UserImportEmailExistException);
            expect(userImportDomain.assertEmailsAvailable).toHaveBeenCalledWith(
                ['bramble@example.com']
            );
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws RoleNotFoundException before preparing when the default role is missing', async () => {
            roleDomain.getByName.mockResolvedValue(null);

            await expect(
                domain.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'role',
                statusCode: EnumRoleStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });

        it('throws CountryNotFoundException before preparing when the default country is missing', async () => {
            countryDomain.getIdByAlpha2Code.mockResolvedValue(null);

            await expect(
                domain.importByAdmin(rows, 'admin-bramble')
            ).rejects.toMatchObject({
                module: 'country',
                statusCode: EnumCountryStatusCodeError.notFound,
            });
            expect(
                userImportDomain.prepareImportByAdmin
            ).not.toHaveBeenCalled();
        });
    });

    describe('commit', () => {
        it('runs every write on one transaction in sign-up order', async () => {
            workspaceUtil.buildOwnedUsers.mockReturnValue([
                {
                    userId: 'user-bramble',
                    workspaceId: 'workspace-invite',
                    name: 'Bramble',
                    slug: 'w-bramble',
                },
            ]);

            const users = await domain.commit(
                [inviteInput],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(users).toEqual([committedUser]);
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledWith(tx, [
                EnumTermPolicyType.termsOfService,
                EnumTermPolicyType.privacy,
            ]);
            expect(userDomain.createManyInTx).toHaveBeenCalledWith(tx, [
                inviteInput,
            ]);
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'hashed',
                EnumPasswordHistoryType.signUp,
                password.passwordPeriodExpired,
                password.passwordCreated,
                'user-bramble'
            );
            expect(notificationDomain.createDefaultsInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble'
            );
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                inviteInput.verification,
                'user-bramble'
            );
            expect(userTwoFactorDomain.createDisabledInTx).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                'user-bramble'
            );
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledWith(tx, [
                {
                    userId: 'user-bramble',
                    workspaceId: 'workspace-invite',
                    name: 'Bramble',
                    slug: 'w-bramble',
                },
            ]);
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
                termPolicyAcceptanceDomain.acceptPublishedInTx
            ).toHaveBeenCalledWith(
                tx,
                'user-bramble',
                [EnumTermPolicyType.termsOfService],
                'user-bramble'
            );

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledBefore(userDomain.createManyInTx);
            expect(userDomain.createManyInTx).toHaveBeenCalledBefore(
                passwordHistoryDomain.createInTx
            );
            expect(passwordHistoryDomain.createInTx).toHaveBeenCalledBefore(
                notificationDomain.createDefaultsInTx
            );
            expect(
                notificationDomain.createDefaultsInTx
            ).toHaveBeenCalledBefore(
                userVerificationDomain.createFromOnboardingInTx
            );
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).toHaveBeenCalledBefore(userTwoFactorDomain.createDisabledInTx);
            expect(
                userTwoFactorDomain.createDisabledInTx
            ).toHaveBeenCalledBefore(workspaceDomain.createOwnedForUsersInTx);
            expect(
                workspaceDomain.createOwnedForUsersInTx
            ).toHaveBeenCalledBefore(workspaceInviteDomain.acceptOnSignUpInTx);
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledBefore(projectMemberDomain.createInTx);
            expect(projectMemberDomain.createInTx).toHaveBeenCalledBefore(
                termPolicyAcceptanceDomain.acceptPublishedInTx
            );
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(1);
        });

        it('creates the project membership only when the invite carries a project and role', async () => {
            await domain.commit(
                [
                    {
                        ...inviteInput,
                        workspaceContext: {
                            ...inviteContext,
                            projectId: null,
                            projectMemberRole: null,
                        },
                    },
                ],
                EnumUserCreateMode.signUp,
                5000
            );

            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).toHaveBeenCalledTimes(1);
            expect(projectMemberDomain.createInTx).not.toHaveBeenCalled();
        });

        it('accepts no invite and writes no history, verification, or password row for a personal social input', async () => {
            await domain.commit(
                [
                    {
                        ...input,
                        password: null,
                        passwordHistoryType: null,
                        verification: null,
                    },
                ],
                EnumUserCreateMode.social,
                5000
            );

            expect(passwordHistoryDomain.createInTx).not.toHaveBeenCalled();
            expect(
                userVerificationDomain.createFromOnboardingInTx
            ).not.toHaveBeenCalled();
            expect(
                workspaceInviteDomain.acceptOnSignUpInTx
            ).not.toHaveBeenCalled();
            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).toHaveBeenCalledTimes(1);
        });

        it('skips the published assertion for an admin create', async () => {
            await domain.commit([input], EnumUserCreateMode.admin, 5000);

            expect(
                termPolicyAcceptanceDomain.assertRequiredPublishedInTx
            ).not.toHaveBeenCalled();
        });

        it('inserts nothing when a required term policy is not published', async () => {
            const error = new TermPolicyRequiredNotPublishedException();
            termPolicyAcceptanceDomain.assertRequiredPublishedInTx.mockRejectedValue(
                error
            );
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userOnboardingUtil.mapCreateCollision.mockReturnValue(error);

            await expect(
                domain.commit([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toBe(error);
            expect(userDomain.createManyInTx).not.toHaveBeenCalled();
        });

        it('retries with the next slug candidate after a slug collision and commits', async () => {
            const collision = new Error('slug collision');
            databaseService.withTransaction
                .mockRejectedValueOnce(collision)
                .mockImplementationOnce(async fn => fn(tx));
            databaseUtil.isUniqueCollision.mockReturnValue(true);

            const users = await domain.commit(
                [input],
                EnumUserCreateMode.signUp,
                5000
            );

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
                domain.commit([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toMatchObject({
                module: 'database',
                statusCode:
                    EnumDatabaseStatusCodeError.uniqueValueGenerationFailed,
                messagePath: 'database.error.uniqueValueGenerationFailed',
            });
            expect(databaseService.withTransaction).toHaveBeenCalledTimes(2);
        });

        it('throws the exception the onboarding util maps a non-slug collision to', async () => {
            const otherError = new Error('duplicate email');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            const mapped = new UserEmailExistException();
            userOnboardingUtil.mapCreateCollision.mockReturnValue(mapped);

            await expect(
                domain.commit([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toBe(mapped);
            expect(userOnboardingUtil.mapCreateCollision).toHaveBeenCalledWith(
                otherError
            );
        });

        it('wraps a non-collision error the onboarding util leaves unmapped in AppUnknownException', async () => {
            const otherError = new Error('unexpected');
            databaseService.withTransaction.mockRejectedValue(otherError);
            databaseUtil.isUniqueCollision.mockReturnValue(false);
            userOnboardingUtil.mapCreateCollision.mockReturnValue(otherError);

            await expect(
                domain.commit([input], EnumUserCreateMode.signUp, 5000)
            ).rejects.toMatchObject({
                constructor: AppUnknownException,
                rawError: otherError,
            });
        });
    });
});
