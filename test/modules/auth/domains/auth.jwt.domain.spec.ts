import { generateKeyPairSync } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Duration } from 'luxon';

import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import {
    EnumRoleType,
    EnumUserGender,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type { IUser } from '@modules/user/interfaces/user.interface';

function createDerKeyPair(namedCurve: 'P-256' | 'P-521') {
    return generateKeyPairSync('ec', {
        namedCurve,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'der' },
    });
}

describe('AuthJwtDomain', () => {
    const accessKeys = createDerKeyPair('P-256');
    const refreshKeys = createDerKeyPair('P-521');
    const databaseUtil = {
        createId: vi.fn<DatabaseUtil['createId']>(),
    } satisfies Pick<DatabaseUtil, 'createId'>;
    const helperDateService = {
        create: vi.fn<HelperDateService['create']>(),
        createFromTimestamp: vi.fn<HelperDateService['createFromTimestamp']>(),
        diff: vi.fn<HelperDateService['diff']>(),
    } satisfies Pick<
        HelperDateService,
        'create' | 'createFromTimestamp' | 'diff'
    >;
    const authUtil = {
        generateJti: vi.fn<AuthUtil['generateJti']>(),
        createPayloadAccessToken: vi.fn<AuthUtil['createPayloadAccessToken']>(),
        createPayloadRefreshToken:
            vi.fn<AuthUtil['createPayloadRefreshToken']>(),
    } satisfies Pick<
        AuthUtil,
        'generateJti' | 'createPayloadAccessToken' | 'createPayloadRefreshToken'
    >;
    const configService = new ConfigService({
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.expirationTimeInSeconds': 3600,
        'auth.jwt.accessToken.privateKey':
            accessKeys.privateKey.toString('base64'),
        'auth.jwt.accessToken.publicKey':
            accessKeys.publicKey.toString('base64'),
        'auth.jwt.accessToken.algorithm': 'ES256',
        'auth.jwt.refreshToken.kid': 'refreshInTx-kid',
        'auth.jwt.refreshToken.expirationTimeInSeconds': 2_592_000,
        'auth.jwt.refreshToken.privateKey':
            refreshKeys.privateKey.toString('base64'),
        'auth.jwt.refreshToken.publicKey':
            refreshKeys.publicKey.toString('base64'),
        'auth.jwt.refreshToken.algorithm': 'ES512',
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'ACK',
        'auth.jwt.issuer': 'https://example.com',
    });
    const accessPayload = {
        userId: 'user-id',
        roleId: 'role-id',
        username: 'user',
        email: 'user@example.com',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: new Date('2026-01-01T00:00:00.000Z'),
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    } satisfies IAuthJwtAccessTokenPayload;
    const refreshPayload = {
        userId: 'user-id',
        sessionId: 'session-id',
        deviceOwnershipId: 'ownership-id',
        loginAt: accessPayload.loginAt,
        loginFrom: EnumUserLoginFrom.website,
        loginWith: EnumUserLoginWith.credential,
    } satisfies IAuthJwtRefreshTokenPayload;
    const now = new Date('2026-01-01T00:00:00.000Z');
    const user = {
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

    let service: AuthJwtDomain;
    let jwtService: JwtService;

    beforeEach(async () => {
        vi.resetAllMocks();
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtDomain,
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                JwtService,
                { provide: ConfigService, useValue: configService },
                { provide: AuthUtil, useValue: authUtil },
            ],
        }).compile();
        service = moduleRef.get(AuthJwtDomain);
        jwtService = moduleRef.get(JwtService);
    });

    it('signs access and refreshInTx tokens with separate credentials and policies', () => {
        const accessToken = service.createAccessToken(
            'user-id',
            'access-jti',
            accessPayload
        );
        const refreshToken = service.createRefreshToken(
            'user-id',
            'refreshInTx-jti',
            refreshPayload,
            120
        );
        const accessDecoded = jwtService.decode(accessToken, {
            complete: true,
        });
        const refreshDecoded = jwtService.decode(refreshToken, {
            complete: true,
        });

        expect(accessDecoded).toMatchObject({
            header: { alg: 'ES256', kid: 'access-kid' },
            payload: { sub: 'user-id', jti: 'access-jti' },
        });
        expect(refreshDecoded).toMatchObject({
            header: { alg: 'ES512', kid: 'refreshInTx-kid' },
            payload: { sub: 'user-id', jti: 'refreshInTx-jti' },
        });
        expect(
            service.validateAccessToken('user-id', 'access-jti', accessToken)
        ).toBe(true);
        expect(
            service.validateRefreshToken(
                'user-id',
                'refreshInTx-jti',
                refreshToken
            )
        ).toBe(true);
        expect(
            service.validateRefreshToken('user-id', 'access-jti', accessToken)
        ).toBe(false);
        expect(
            service.validateAccessToken(
                'user-id',
                'refreshInTx-jti',
                refreshToken
            )
        ).toBe(false);
    });

    it('returns false when signature or registered-claim verification fails', () => {
        expect(service.validateAccessToken('user-id', 'jti', 'token')).toBe(
            false
        );
        expect(service.validateRefreshToken('user-id', 'jti', 'token')).toBe(
            false
        );
    });

    it('issues a token pair with fresh session, ownership, and jti identifiers', () => {
        databaseUtil.createId
            .mockReturnValueOnce('session-id')
            .mockReturnValueOnce('ownership-id');
        helperDateService.create.mockReturnValue(now);
        authUtil.generateJti.mockReturnValue('new-jti');
        authUtil.createPayloadAccessToken.mockReturnValue(accessPayload);
        authUtil.createPayloadRefreshToken.mockReturnValue(refreshPayload);

        const result = service.createTokens(
            user,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential
        );

        expect(result).toMatchObject({
            jti: 'new-jti',
            sessionId: 'session-id',
            tokens: {
                tokenType: 'Bearer',
                roleType: EnumRoleType.user,
                expiresIn: 3600,
            },
        });
        expect(authUtil.createPayloadAccessToken).toHaveBeenCalledWith(
            user,
            'session-id',
            'ownership-id',
            now,
            EnumUserLoginFrom.website,
            EnumUserLoginWith.credential
        );
        expect(
            service.validateAccessToken(
                'user-id',
                'new-jti',
                result.tokens.accessToken
            )
        ).toBe(true);
        expect(
            service.validateRefreshToken(
                'user-id',
                'new-jti',
                result.tokens.refreshToken
            )
        ).toBe(true);
    });

    it('rotates both tokens while retaining the session and old refreshInTx deadline', () => {
        const oldRefreshToken = service.createRefreshToken(
            'user-id',
            'old-jti',
            refreshPayload,
            300
        );
        const decoded =
            jwtService.decode<IAuthJwtRefreshTokenPayload>(oldRefreshToken);
        const expiredAt = new Date((decoded.exp ?? 0) * 1000);
        authUtil.generateJti.mockReturnValue('rotated-jti');
        authUtil.createPayloadAccessToken.mockReturnValue(accessPayload);
        authUtil.createPayloadRefreshToken.mockReturnValue(refreshPayload);
        helperDateService.create.mockReturnValue(now);
        helperDateService.createFromTimestamp.mockReturnValue(expiredAt);
        helperDateService.diff.mockReturnValue(Duration.fromMillis(120_000));

        const result = service.refreshToken(user, oldRefreshToken);

        expect(result).toMatchObject({
            jti: 'rotated-jti',
            sessionId: 'session-id',
            expiredInMs: 120_000,
        });
        expect(
            service.validateRefreshToken(
                'user-id',
                'rotated-jti',
                result.tokens.refreshToken
            )
        ).toBe(true);
        expect(
            service.validateRefreshToken(
                'user-id',
                'old-jti',
                result.tokens.refreshToken
            )
        ).toBe(false);
    });
});
