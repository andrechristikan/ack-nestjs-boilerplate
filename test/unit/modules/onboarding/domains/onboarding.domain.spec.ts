import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumActivityLogAction,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IAuthPassword } from '@modules/auth/interfaces/auth.interface';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserDomain } from '@modules/user/domains/user.domain';
import { UserImportDomain } from '@modules/user/domains/user.import.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateByAdmin,
    IUserCreateWithWorkspaceInput,
    IUserImport,
    IUserLoginOutcome,
    IUserLoginSocial,
    IUserSignUp,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';

describe('OnboardingDomain', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userDomain: MockProxy<UserDomain> = mock<UserDomain>();
    const userImportDomain: MockProxy<UserImportDomain> =
        mock<UserImportDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();

    let domain: OnboardingDomain;

    const workspaceContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble'],
        name: "bramble2fox's Workspace",
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: true,
            cookies: true,
        },
        acceptedTermPolicyTypes: [],
        password: null,
        passwordHistoryType: null,
        verification: null,
        workspaceContext,
        createdBy: 'user-bramble',
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
    const outcome: IUserLoginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        tokens: {
            tokenType: 'Bearer',
            roleType: EnumRoleType.user,
            expiresIn: 3600,
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        },
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: false,
        },
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

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OnboardingDomain,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: UserDomain, useValue: userDomain },
                { provide: UserImportDomain, useValue: userImportDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
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

        it('resolves the workspace, prepares, commits, then notifies the created user', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);

            await domain.signUp(signUpInput);

            expect(workspaceInviteDomain.resolveForSignUp).toHaveBeenCalledWith(
                signUpInput.inviteToken,
                signUpInput.email,
                signUpInput.username
            );
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                signUpInput,
                workspaceContext
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [input],
                EnumUserCreateMode.signUp,
                5000
            );
            expect(userAuthDomain.notifyWelcome).toHaveBeenCalledWith(
                createdUser.id,
                emailVerification
            );
        });
    });

    describe('loginWithSocial', () => {
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

        it('commits the new user, logs in, then notifies the social welcome', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(input);
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);
            userAuthDomain.loginWithSocial.mockResolvedValue(outcome);

            const result = await domain.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );

            expect(result).toBe(outcome);
            expect(workspaceInviteDomain.resolveForSignUp).toHaveBeenCalledWith(
                null,
                'bramble@example.com',
                loginSocial.username
            );
            expect(userAuthDomain.prepareSocialCreate).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial,
                workspaceContext
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [input],
                EnumUserCreateMode.social,
                5000
            );
            expect(userAuthDomain.loginWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );
            expect(userAuthDomain.notifyWelcomeSocial).toHaveBeenCalledWith(
                createdUser.id
            );
        });

        it('skips the commit and the welcome when the user already exists', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(null);
            userAuthDomain.loginWithSocial.mockResolvedValue(outcome);

            const result = await domain.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                loginSocial
            );

            expect(result).toBe(outcome);
            expect(workspaceDomain.commitOnboarding).not.toHaveBeenCalled();
            expect(userAuthDomain.notifyWelcomeSocial).not.toHaveBeenCalled();
        });

        it('rejects without the welcome when the login of a new user fails', async () => {
            const failure = new Error('login failed');
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(input);
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);
            userAuthDomain.loginWithSocial.mockRejectedValue(failure);

            await expect(
                domain.loginWithSocial(
                    'bramble@example.com',
                    EnumUserLoginWith.socialGoogle,
                    loginSocial
                )
            ).rejects.toBe(failure);
            expect(userAuthDomain.notifyWelcomeSocial).not.toHaveBeenCalled();
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
        const password: IAuthPassword = {
            passwordHash: 'hashed',
            passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
            passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
            passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
        };

        it('commits as admin, notifies the temporary password, and returns the id', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: { ...input, password },
                passwordString: 'random-password',
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);

            const result = await domain.createByAdmin(create, 'admin-bramble');

            expect(result).toBe(createdUser.id);
            expect(userDomain.prepareCreateByAdmin).toHaveBeenCalledWith(
                create,
                'admin-bramble'
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [{ ...input, password }],
                EnumUserCreateMode.admin,
                5000,
                EnumActivityLogAction.adminUserCreate
            );
            expect(userDomain.notifyWelcomeByAdmin).toHaveBeenCalledWith(
                createdUser.id,
                'random-password',
                password.passwordCreated,
                password.passwordExpired,
                'admin-bramble'
            );
        });

        it('skips the welcome notification when no password was generated', async () => {
            userDomain.prepareCreateByAdmin.mockResolvedValue({
                input: { ...input, password: null },
                passwordString: 'random-password',
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);

            await domain.createByAdmin(create, 'admin-bramble');

            expect(userDomain.notifyWelcomeByAdmin).not.toHaveBeenCalled();
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

        it('commits the prepared rows in bulk, then notifies the imported users', async () => {
            const passwordHasheds: IAuthPassword[] = [
                {
                    passwordHash: 'hashed',
                    passwordExpired: new Date('2026-06-01T00:00:00.000Z'),
                    passwordCreated: new Date('2026-01-01T00:00:00.000Z'),
                    passwordPeriodExpired: new Date('2026-04-01T00:00:00.000Z'),
                },
            ];
            userImportDomain.prepareImportByAdmin.mockResolvedValue({
                inputs: [input],
                passwordHasheds,
                passwordStrings: ['random-password'],
            });
            userOnboardingDomain.getCreateBulkTimeoutInMs.mockReturnValue(
                30000
            );
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);

            await domain.importByAdmin(rows, 'admin-bramble');

            expect(userImportDomain.prepareImportByAdmin).toHaveBeenCalledWith(
                rows,
                'admin-bramble'
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [input],
                EnumUserCreateMode.admin,
                30000,
                EnumActivityLogAction.adminUserImport
            );
            expect(userImportDomain.notifyImported).toHaveBeenCalledWith(
                [createdUser],
                passwordHasheds,
                ['random-password'],
                'admin-bramble'
            );
        });
    });
});
