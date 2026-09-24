import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import type { IDeviceIdentity } from '@modules/device/interfaces/device.interface';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import {
    EnumUserCreateMode,
    EnumUserSignUpWorkspaceContextType,
} from '@modules/user/enums/user.enum';
import type {
    IUser,
    IUserCreateWithWorkspaceInput,
    IUserLoginOutcome,
    IUserSignUpWorkspaceContext,
    IUserVerificationEmailCreate,
} from '@modules/user/interfaces/user.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { UserOnboardingDomain } from '@modules/user/domains/user.onboarding.domain';
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import { WorkspaceDomain } from '@modules/workspace/domains/workspace.domain';
import { WorkspaceInviteDomain } from '@modules/workspace/domains/workspace.invite.domain';

describe('UserAuthHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const userOnboardingDomain: MockProxy<UserOnboardingDomain> =
        mock<UserOnboardingDomain>();
    const workspaceInviteDomain: MockProxy<WorkspaceInviteDomain> =
        mock<WorkspaceInviteDomain>();
    const workspaceDomain: MockProxy<WorkspaceDomain> = mock<WorkspaceDomain>();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const device = {
        fingerprint: 'fingerprint',
        name: 'device',
        notificationToken: 'token',
    } satisfies IDeviceIdentity;
    const tokens = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 3600,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
    } satisfies IAuthToken;
    const loginOutcome = {
        isTwoFactorEnable: false,
        lastWorkspaceId: 'workspace-id',
        lastWorkspaceChangedAt: now,
        tokens,
    } satisfies IUserLoginOutcome;
    const personalWorkspaceContext = {
        type: EnumUserSignUpWorkspaceContextType.personal,
        workspaceId: 'workspace-id',
        slugCandidates: ['candidate'],
        name: 'user',
    } satisfies IUserSignUpWorkspaceContext;
    const createdUser = {
        id: 'user-id',
        name: 'User',
        username: 'user',
        isVerified: true,
        verifiedAt: now,
        email: 'user@example.com',
        roleId: 'role-id',
        password: 'hash',
        passwordExpired: null,
        passwordCreated: now,
        passwordAttempt: 0,
        signUpAt: now,
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        status: EnumUserStatus.active,
        gender: EnumUserGender.male,
        countryId: 'country-id',
        lastLoginAt: null,
        lastIPAddress: null,
        lastLoginFrom: null,
        lastLoginWith: null,
        lastWorkspaceId: null,
        lastWorkspaceChangedAt: null,
        createdAt: now,
        createdBy: null,
        updatedAt: now,
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        termsOfServiceAccepted: true,
        privacyAccepted: true,
        cookiesAccepted: false,
        marketingAccepted: false,
        role: {
            id: 'role-id',
            name: 'User',
            description: null,
            type: EnumRoleType.user,
            createdAt: now,
            createdBy: null,
            updatedAt: now,
            updatedBy: null,
            policies: [],
        },
        twoFactor: null,
    } satisfies IUser;
    const preparedInput = {
        userId: 'user-id',
        email: 'user@example.com',
        name: null,
        username: 'user',
        countryId: 'country-id',
        roleId: 'role-id',
        signUpFrom: EnumUserSignUpFrom.website,
        signUpWith: EnumUserSignUpWith.credential,
        isVerified: false,
        termPolicy: {} as never,
        acceptedTermPolicyTypes: [],
        password: null,
        passwordHistoryType: null,
        verification: null,
        workspaceContext: personalWorkspaceContext,
        createdBy: 'user-id',
    } satisfies IUserCreateWithWorkspaceInput;
    const emailVerification = {
        type: 'email',
        expiredAt: now,
        expiredInMinutes: 60,
        resendInMinutes: 5,
        reference: 'reference',
        token: 'token',
        hashedToken: 'hashed-token',
        link: 'https://example.com/verify',
    } satisfies IUserVerificationEmailCreate;

    let service: UserAuthHttpService;

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
        it('delegates to the domain and wraps the outcome', async () => {
            const request = {
                email: 'user@example.com',
                password: 'password',
                from: EnumUserLoginFrom.website,
                device,
            } satisfies UserLoginRequestDto;
            userAuthDomain.loginCredential.mockResolvedValue(loginOutcome);

            const result = await service.loginCredential(request);

            expect(result).toEqual({ data: loginOutcome });
            expect(userAuthDomain.loginCredential).toHaveBeenCalledWith({
                email: request.email,
                password: request.password,
                from: request.from,
                device: request.device,
            });
        });
    });

    describe('refresh', () => {
        it('delegates to the domain and wraps the tokens', async () => {
            userAuthDomain.refresh.mockResolvedValue(tokens);

            const result = await service.refresh(createdUser, 'refresh-token');

            expect(result).toEqual({ data: tokens });
            expect(userAuthDomain.refresh).toHaveBeenCalledWith(
                createdUser,
                'refresh-token'
            );
        });
    });

    describe('logout', () => {
        it('delegates to the domain', async () => {
            userAuthDomain.logout.mockResolvedValue(undefined);

            await service.logout(
                'user-id',
                'session-id',
                'device-ownership-id'
            );

            expect(userAuthDomain.logout).toHaveBeenCalledWith(
                'user-id',
                'session-id',
                'device-ownership-id'
            );
        });
    });

    describe('signUp', () => {
        it('resolves invite context, prepares, commits onboarding and notifies welcome in order', async () => {
            const request = {
                countryId: 'country-id',
                email: 'user@example.com',
                username: 'user',
                password: 'Password123!!',
                inviteToken: 'invite-token',
                name: 'User',
                from: EnumUserSignUpFrom.website,
                cookies: true,
                marketing: false,
            } satisfies UserSignUpRequestDto;
            const callOrder: string[] = [];
            workspaceInviteDomain.resolveForSignUp.mockImplementation(
                async () => {
                    callOrder.push('resolveForSignUp');
                    return personalWorkspaceContext;
                }
            );
            userAuthDomain.prepareSignUp.mockImplementation(async () => {
                callOrder.push('prepareSignUp');
                return { input: preparedInput, emailVerification };
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockImplementation(async () => {
                callOrder.push('commitOnboarding');
                return [createdUser];
            });
            userAuthDomain.notifyWelcome.mockImplementation(async () => {
                callOrder.push('notifyWelcome');
            });

            await service.signUp(request);

            expect(workspaceInviteDomain.resolveForSignUp).toHaveBeenCalledWith(
                'invite-token',
                request.email,
                request.username
            );
            expect(userAuthDomain.prepareSignUp).toHaveBeenCalledWith(
                {
                    countryId: request.countryId,
                    email: request.email,
                    username: request.username,
                    password: request.password,
                    inviteToken: request.inviteToken,
                    name: request.name,
                    from: request.from,
                    cookies: request.cookies,
                    marketing: request.marketing,
                },
                personalWorkspaceContext
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [preparedInput],
                EnumUserCreateMode.signUp,
                5000
            );
            expect(userAuthDomain.notifyWelcome).toHaveBeenCalledWith(
                createdUser.id,
                emailVerification
            );
            expect(callOrder).toEqual([
                'resolveForSignUp',
                'prepareSignUp',
                'commitOnboarding',
                'notifyWelcome',
            ]);
        });

        it('resolves a null invite token to null', async () => {
            const request = {
                countryId: 'country-id',
                email: 'user@example.com',
                username: 'user',
                password: 'Password123!!',
                name: 'User',
                from: EnumUserSignUpFrom.website,
                cookies: true,
                marketing: false,
            } satisfies UserSignUpRequestDto;
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                personalWorkspaceContext
            );
            userAuthDomain.prepareSignUp.mockResolvedValue({
                input: preparedInput,
                emailVerification,
            });
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);
            userAuthDomain.notifyWelcome.mockResolvedValue(undefined);

            await service.signUp(request);

            expect(workspaceInviteDomain.resolveForSignUp).toHaveBeenCalledWith(
                null,
                request.email,
                request.username
            );
        });
    });

    describe('loginWithSocial', () => {
        const socialRequest = {
            username: 'user',
            name: 'User',
            countryId: 'country-id',
            from: EnumUserLoginFrom.website,
            device,
            cookies: true,
            marketing: false,
            inviteToken: 'invite-token',
        } satisfies UserCreateSocialRequestDto;

        it('commits onboarding when prepareSocialCreate resolves truthy', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                personalWorkspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(preparedInput);
            userOnboardingDomain.getCreateTimeoutInMs.mockReturnValue(5000);
            workspaceDomain.commitOnboarding.mockResolvedValue([createdUser]);
            userAuthDomain.loginWithSocial.mockResolvedValue(loginOutcome);

            const result = await service.loginWithSocial(
                'user@example.com',
                EnumUserLoginWith.socialGoogle,
                socialRequest
            );

            expect(workspaceInviteDomain.resolveForSignUp).toHaveBeenCalledWith(
                'invite-token',
                'user@example.com',
                socialRequest.username
            );
            expect(userAuthDomain.prepareSocialCreate).toHaveBeenCalledWith(
                'user@example.com',
                EnumUserLoginWith.socialGoogle,
                {
                    from: socialRequest.from,
                    device: socialRequest.device,
                    username: socialRequest.username,
                    inviteToken: socialRequest.inviteToken,
                    name: socialRequest.name,
                    countryId: socialRequest.countryId,
                    cookies: socialRequest.cookies,
                    marketing: socialRequest.marketing,
                },
                personalWorkspaceContext
            );
            expect(workspaceDomain.commitOnboarding).toHaveBeenCalledWith(
                [preparedInput],
                EnumUserCreateMode.social,
                5000
            );
            expect(userAuthDomain.loginWithSocial).toHaveBeenCalledWith(
                'user@example.com',
                EnumUserLoginWith.socialGoogle,
                {
                    from: socialRequest.from,
                    device: socialRequest.device,
                    username: socialRequest.username,
                    inviteToken: socialRequest.inviteToken,
                    name: socialRequest.name,
                    countryId: socialRequest.countryId,
                    cookies: socialRequest.cookies,
                    marketing: socialRequest.marketing,
                }
            );
            expect(result).toEqual({ data: loginOutcome });
        });

        it('skips onboarding when prepareSocialCreate resolves falsy', async () => {
            workspaceInviteDomain.resolveForSignUp.mockResolvedValue(
                personalWorkspaceContext
            );
            userAuthDomain.prepareSocialCreate.mockResolvedValue(null);
            userAuthDomain.loginWithSocial.mockResolvedValue(loginOutcome);

            const result = await service.loginWithSocial(
                'user@example.com',
                EnumUserLoginWith.socialApple,
                socialRequest
            );

            expect(
                userOnboardingDomain.getCreateTimeoutInMs
            ).not.toHaveBeenCalled();
            expect(workspaceDomain.commitOnboarding).not.toHaveBeenCalled();
            expect(result).toEqual({ data: loginOutcome });
        });
    });
});
