import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserSignUpWorkspacePersonal,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';

describe('UserAuthHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();

    let service: UserAuthHttpService;

    const workspaceContext: IUserSignUpWorkspacePersonal = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-bramble',
        slugCandidates: ['w-bramble'],
        name: "bramble2fox's Workspace",
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
    const device = { fingerprint: 'device-bramble' };

    function buildUser(overrides: Partial<IUser> = {}): IUser {
        return {
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
            ...overrides,
        };
    }

    beforeEach(async () => {
        vi.resetAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserAuthHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                {
                    provide: UserOnboardingDomain,
                    useValue: userOnboardingDomain,
                },
                {
                    provide: WorkspaceInviteDomain,
                    useValue: workspaceInviteDomain,
                },
                { provide: WorkspaceDomain, useValue: workspaceDomain },
            ],
        }).compile();
        service = module.get(UserAuthHttpService);
    });

    describe('loginCredential', () => {
        it('wraps the outcome in a response envelope', async () => {
            const dto: UserLoginRequestDto = {
                email: 'bramble@example.com' as Lowercase<string>,
                password: 'plain-password',
                from: EnumUserLoginFrom.website,
                device,
            };
            userAuthDomain.loginCredential.mockResolvedValue(outcome);

            await expect(service.loginCredential(dto)).resolves.toEqual({
                data: outcome,
            });
            expect(userAuthDomain.loginCredential).toHaveBeenCalledWith({
                email: dto.email,
                password: dto.password,
                from: dto.from,
                device: dto.device,
            });
        });
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

        it('commits onboarding and logs in when the user is new', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            const prepared: IUserCreateWithWorkspaceInput = {
                userId: 'user-bramble',
                email: 'bramble@example.com',
                name: dto.name ?? null,
                username: dto.username,
                countryId: dto.countryId,
                roleId: 'role-bramble',
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.socialGoogle,
                isVerified: true,
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
            userAuthDomain.prepareSocialCreate.mockResolvedValue(prepared);
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(10000);
            userAuthDomain.loginWithSocial.mockResolvedValue(outcome);

            const result = await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(result).toEqual({ data: outcome });
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [prepared],
                EnumUserCreateMode.social,
                10000
            );
        });

        it('logs in directly without committing onboarding when the user already exists', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(null);
            userAuthDomain.loginWithSocial.mockResolvedValue(outcome);

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(workspaceDomain.commitOnboarding).not.toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('wraps the tokens in a response envelope', async () => {
            const user = buildUser();
            const tokens: IAuthToken = outcome.tokens!;
            userAuthDomain.refresh.mockResolvedValue(tokens);

            await expect(
                service.refresh(user, 'refresh-token')
            ).resolves.toEqual({ data: tokens });
            expect(userAuthDomain.refresh).toHaveBeenCalledWith(
                user,
                'refresh-token'
            );
        });
    });

    describe('signUp', () => {
        it('commits onboarding and notifies the new user', async () => {
            const dto: UserSignUpRequestDto = {
                username: 'bramble2fox',
                countryId: 'country-bramble',
                email: 'bramble@example.com' as Lowercase<string>,
                password: 'plainPassword123!',
                marketing: true,
                cookies: true,
                from: EnumUserSignUpFrom.website,
            };
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                workspaceContext
            );
            const input: IUserCreateWithWorkspaceInput = {
                userId: 'user-bramble',
                email: dto.email,
                name: null,
                username: dto.username,
                countryId: dto.countryId,
                roleId: 'role-bramble',
                signUpFrom: dto.from,
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
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input,
                emailVerification,
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(10000);
            const created = buildUser();
            workspaceDomain.commitOnboarding.mockResolvedValue([created]);

            await service.signUp(dto);

            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [input],
                EnumUserCreateMode.signUp,
                10000
            );
            expect(userAuthDomain.notifyWelcome).toHaveBeenCalledWith(
                created.id,
                emailVerification
            );
        });
    });

    describe('logout', () => {
        it('delegates to the domain', async () => {
            await service.logout(
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble'
            );

            expect(userAuthDomain.logout).toHaveBeenCalledWith(
                'user-bramble',
                'session-bramble',
                'device-ownership-bramble'
            );
        });
    });
});
