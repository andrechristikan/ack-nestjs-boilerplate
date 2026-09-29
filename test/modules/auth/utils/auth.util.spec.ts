import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { mock } from 'vitest-mock-extended';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import type { User } from '@generated/prisma-client/client';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type { IAuthJwtAccessTokenPayload } from '@modules/auth/interfaces/auth.interface';

describe('AuthUtil', () => {
    const helperStringService = mock<HelperStringService>();
    let util: AuthUtil;

    beforeEach(async () => {
        vi.resetAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthUtil,
                {
                    provide: HelperStringService,
                    useValue: helperStringService,
                },
            ],
        }).compile();
        util = module.get(AuthUtil);
    });

    describe('createPayloadAccessToken', () => {
        it('assembles the access token payload from the user and login context', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const user: User = {
                id: 'user-1',
                name: 'Jane Doe',
                username: 'jane',
                isVerified: true,
                verifiedAt: null,
                email: 'jane@example.com',
                roleId: 'role-1',
                password: 'hashed',
                passwordExpired: null,
                passwordCreated: null,
                passwordAttempt: null,
                signUpAt: loginAt,
                signUpFrom: EnumUserSignUpFrom.website,
                signUpWith: EnumUserSignUpWith.credential,
                status: EnumUserStatus.active,
                gender: null,
                countryId: 'country-1',
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
                    cookies: true,
                },
                photo: null,
                createdAt: loginAt,
                createdBy: null,
                updatedAt: loginAt,
                updatedBy: null,
                deletedAt: null,
                deletedBy: null,
            };

            const result = util.createPayloadAccessToken(
                user,
                'session-1',
                'device-ownership-1',
                loginAt,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );

            expect(result).toEqual({
                userId: user.id,
                roleId: user.roleId,
                username: user.username,
                email: user.email,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
            });
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('derives the minimal refresh token payload from an access token payload', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const accessPayload: IAuthJwtAccessTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'jane@example.com',
                username: 'jane',
                userId: 'user-1',
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                roleId: 'role-1',
            };

            const result = util.createPayloadRefreshToken(accessPayload);

            expect(result).toEqual({
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                userId: 'user-1',
            });
        });
    });

    describe('generateJti', () => {
        it('generates a random 32-character jti', () => {
            helperStringService.random.mockReturnValue('random-jti-value');

            const result = util.generateJti();

            expect(result).toBe('random-jti-value');
            expect(helperStringService.random).toHaveBeenCalledWith(32);
        });
    });
});
