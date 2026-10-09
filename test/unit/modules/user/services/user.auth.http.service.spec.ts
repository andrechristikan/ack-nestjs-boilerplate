import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import {
    EnumDevicePlatform,
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { IAuthToken } from '@modules/auth/interfaces/auth.interface';
import { UserAuthDomain } from '@modules/user/domains/user.auth.domain';
import { OnboardingDomain } from '@modules/onboarding/domains/onboarding.domain';
import { UserAuthHttpService } from '@modules/user/services/user.auth.http.service';
import type { UserCreateSocialRequestDto } from '@modules/user/dtos/request/user.create-social.request.dto';
import type { UserLoginRequestDto } from '@modules/user/dtos/request/user.login.request.dto';
import type { UserSignUpRequestDto } from '@modules/user/dtos/request/user.sign-up.request.dto';
import type {
    IUser,
    IUserLoginOutcome,
} from '@modules/user/interfaces/user.interface';

describe('UserAuthHttpService', () => {
    const userAuthDomain: MockProxy<UserAuthDomain> = mock<UserAuthDomain>();
    const onboardingDomain: MockProxy<OnboardingDomain> =
        mock<OnboardingDomain>();

    let service: UserAuthHttpService;

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
                UserAuthHttpService,
                { provide: UserAuthDomain, useValue: userAuthDomain },
                { provide: OnboardingDomain, useValue: onboardingDomain },
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
                device: {
                    fingerprint: dto.device.fingerprint,
                    name: null,
                    platform: null,
                    notificationToken: null,
                },
            });
        });

        it('forwards the optional device fields when present', async () => {
            const dto: UserLoginRequestDto = {
                email: 'bramble@example.com' as Lowercase<string>,
                password: 'plain-password',
                from: EnumUserLoginFrom.website,
                device: {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
            };
            userAuthDomain.loginCredential.mockResolvedValue(outcome);

            await service.loginCredential(dto);

            expect(userAuthDomain.loginCredential).toHaveBeenCalledWith({
                email: dto.email,
                password: dto.password,
                from: dto.from,
                device: {
                    fingerprint: 'device-bramble',
                    name: 'Bramble phone',
                    platform: EnumDevicePlatform.ios,
                    notificationToken: 'token-bramble',
                },
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

        it('delegates to OnboardingDomain and wraps the outcome', async () => {
            onboardingDomain.loginWithSocial.mockResolvedValue(outcome);

            const result = await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dto
            );

            expect(result).toEqual({ data: outcome });
            expect(onboardingDomain.loginWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                {
                    from: dto.from,
                    device: {
                        fingerprint: dto.device.fingerprint,
                        name: null,
                        platform: null,
                        notificationToken: null,
                    },
                    username: dto.username,
                    inviteToken: null,
                    name: dto.name,
                    countryId: dto.countryId,
                    cookies: dto.cookies,
                    marketing: dto.marketing,
                }
            );
        });

        it('passes a null name when the dto omits it', async () => {
            const dtoWithoutName: UserCreateSocialRequestDto = {
                username: dto.username,
                countryId: dto.countryId,
                marketing: dto.marketing,
                cookies: dto.cookies,
                from: dto.from,
                device,
            };
            onboardingDomain.loginWithSocial.mockResolvedValue(outcome);

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                dtoWithoutName
            );

            expect(onboardingDomain.loginWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({ name: null, inviteToken: null })
            );
        });

        it('forwards the invite token when the dto carries one', async () => {
            onboardingDomain.loginWithSocial.mockResolvedValue(outcome);

            await service.loginWithSocial(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                { ...dto, inviteToken: 'invite-bramble' }
            );

            expect(onboardingDomain.loginWithSocial).toHaveBeenCalledWith(
                'bramble@example.com',
                EnumUserLoginWith.socialGoogle,
                expect.objectContaining({ inviteToken: 'invite-bramble' })
            );
        });
    });

    describe('refresh', () => {
        it('wraps the tokens in a response envelope', async () => {
            const user = baseUser;
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
        const dto: UserSignUpRequestDto = {
            username: 'bramble2fox',
            countryId: 'country-bramble',
            email: 'bramble@example.com' as Lowercase<string>,
            password: 'plainPassword123!',
            marketing: true,
            cookies: true,
            from: EnumUserSignUpFrom.website,
        };

        it('delegates sign-up to OnboardingDomain and returns an empty envelope', async () => {
            const result = await service.signUp(dto);

            expect(onboardingDomain.signUp).toHaveBeenCalledWith({
                countryId: dto.countryId,
                email: dto.email,
                username: dto.username,
                password: dto.password,
                inviteToken: null,
                name: null,
                from: dto.from,
                cookies: dto.cookies,
                marketing: dto.marketing,
            });
            expect(result).toEqual({});
        });

        it('forwards the name and invite token when the dto carries them', async () => {
            await service.signUp({
                ...dto,
                name: 'Bramble Fox',
                inviteToken: 'invite-bramble',
            });

            expect(onboardingDomain.signUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'Bramble Fox',
                    inviteToken: 'invite-bramble',
                })
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
