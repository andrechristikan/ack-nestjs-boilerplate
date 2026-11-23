import { EnumRolePlatformKey } from '@modules/role/enums/role.enum';
import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { generateKeyPairSync } from 'node:crypto';
import { Duration } from 'luxon';
import {
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
    EnumRoleScope,
} from '@generated/prisma-client/client';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { HelperEncryptionService } from '@common/helper/services/helper.encryption.service';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';

const accessKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const accessPrivateKeyBase64 = accessKeyPair.privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');
const accessPublicKeyBase64 = accessKeyPair.publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');
const refreshKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-521' });
const refreshPrivateKeyBase64 = refreshKeyPair.privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');
const refreshPublicKeyBase64 = refreshKeyPair.publicKey
    .export({ type: 'spki', format: 'der' })
    .toString('base64');

describe('AuthJwtService', () => {
    const helperEncryptionService: MockProxy<HelperEncryptionService> =
        mock<HelperEncryptionService>();
    const jwtService: MockProxy<JwtService> = mock<JwtService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let service: AuthJwtService;

    const user: IUser = {
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
        passwordAttempt: 0,
        passwordLockedUntil: null,
        signUpAt: new Date('2026-01-01T00:00:00.000Z'),
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
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
            scope: EnumRoleScope.platform,
            key: 'user',
            name: 'user',
            policyRevision: 0,
        },
    };

    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleKey: EnumRolePlatformKey.user,
        expiresIn: 900,
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
    };

    const configValues: Record<string, string | number> = {
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.expiresInSeconds': 900,
        'auth.jwt.refreshToken.kid': 'refresh-kid',
        'auth.jwt.refreshToken.expiresInSeconds': 604800,
        'auth.jwt.accessToken.privateKey': accessPrivateKeyBase64,
        'auth.jwt.accessToken.publicKey': accessPublicKeyBase64,
        'auth.jwt.accessToken.algorithm': 'ES256',
        'auth.jwt.refreshToken.privateKey': refreshPrivateKeyBase64,
        'auth.jwt.refreshToken.publicKey': refreshPublicKeyBase64,
        'auth.jwt.refreshToken.algorithm': 'ES512',
        'auth.jwt.audience': 'aud',
        'auth.jwt.issuer': 'iss',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);
        helperEncryptionService.derBase64ToPem.mockImplementation(
            (der, label) => `pem(${label}:${der})`
        );

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtService,
                {
                    provide: HelperEncryptionService,
                    useValue: helperEncryptionService,
                },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
                { provide: AuthUtil, useValue: authUtil },
                { provide: HelperDateService, useValue: helperDateService },
            ],
        }).compile();

        service = module.get(AuthJwtService);
    });

    describe('createAccessToken', () => {
        it('signs the payload with the access private key and options', () => {
            jwtService.sign.mockReturnValue('signed-access-token');
            const payload: IAuthJwtAccessTokenPayload = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: 'jane@example.com',
                username: 'jane',
                userId: 'user-1',
                sessionId: 'session-1',
                deviceOwnershipId: 'device-1',
                roleId: 'role-1',
            };

            const result = service.createAccessToken(
                'user-1',
                'jti-value',
                payload
            );

            expect(result).toBe('signed-access-token');
            expect(jwtService.sign).toHaveBeenCalledWith(
                payload,
                expect.objectContaining({
                    expiresIn: 900,
                    audience: 'aud',
                    issuer: 'iss',
                    subject: 'user-1',
                    algorithm: 'ES256',
                    keyid: 'access-kid',
                    jwtid: 'jti-value',
                })
            );
        });
    });

    describe('createRefreshToken', () => {
        const payload: IAuthJwtRefreshTokenPayload = {
            loginAt: new Date('2026-01-01T00:00:00.000Z'),
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
            userId: 'user-1',
            sessionId: 'session-1',
            deviceOwnershipId: 'device-1',
        };

        it('signs the payload with the configured default expiry', () => {
            jwtService.sign.mockReturnValue('signed-refresh-token');

            const result = service.createRefreshToken(
                'user-1',
                'jti-value',
                payload
            );

            expect(result).toBe('signed-refresh-token');
            expect(jwtService.sign).toHaveBeenCalledWith(
                payload,
                expect.objectContaining({
                    expiresIn: 604800,
                    algorithm: 'ES512',
                    keyid: 'refresh-kid',
                    jwtid: 'jti-value',
                })
            );
        });

        it('signs the payload with a given expiry override', () => {
            jwtService.sign.mockReturnValue('signed-refresh-token');

            service.createRefreshToken('user-1', 'jti-value', payload, 1234);

            expect(jwtService.sign).toHaveBeenCalledWith(
                payload,
                expect.objectContaining({ expiresIn: 1234 })
            );
        });
    });

    describe('validateAccessToken', () => {
        it('returns true when verification succeeds', () => {
            jwtService.verify.mockReturnValue({});

            const result = service.validateAccessToken(
                'user-1',
                'jti-value',
                'token'
            );

            expect(result).toBe(true);
            expect(jwtService.verify).toHaveBeenCalledWith('token', {
                publicKey: expect.any(String) as string,
                algorithms: ['ES256'],
                audience: 'aud',
                issuer: 'iss',
                subject: 'user-1',
                jwtid: 'jti-value',
            });
        });

        it('returns false when verification throws', () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('invalid signature');
            });

            const result = service.validateAccessToken(
                'user-1',
                'jti-value',
                'token'
            );

            expect(result).toBe(false);
        });
    });

    describe('validateRefreshToken', () => {
        it('returns true when verification succeeds', () => {
            jwtService.verify.mockReturnValue({});

            const result = service.validateRefreshToken(
                'user-1',
                'jti-value',
                'token'
            );

            expect(result).toBe(true);
        });

        it('returns false when verification throws', () => {
            jwtService.verify.mockImplementation(() => {
                throw new Error('invalid signature');
            });

            const result = service.validateRefreshToken(
                'user-1',
                'jti-value',
                'token'
            );

            expect(result).toBe(false);
        });
    });

    describe('payloadToken', () => {
        it('decodes the token without verification', () => {
            const decoded = { userId: 'user-1' };
            jwtService.decode.mockReturnValue(decoded);

            const result = service.payloadToken<typeof decoded>('token');

            expect(result).toBe(decoded);
            expect(jwtService.decode).toHaveBeenCalledWith('token');
        });
    });

    describe('getRefreshJti', () => {
        const payload = {
            loginAt: new Date('2026-01-01T00:00:00.000Z'),
            userId: 'user-1',
            sessionId: 'session-1',
            deviceOwnershipId: 'device-ownership-1',
            loginFrom: EnumUserLoginFrom.website,
            loginWith: EnumUserLoginWith.credential,
        };

        it('returns the jti the refresh payload carries', () => {
            expect(service.getRefreshJti({ ...payload, jti: 'jti-1' })).toBe(
                'jti-1'
            );
        });

        it('throws AuthJwtRefreshTokenInvalidException when the payload carries no jti', () => {
            expect(() => service.getRefreshJti(payload)).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                    messagePath: 'auth.error.refreshTokenUnauthorized',
                })
            );
        });
    });

    describe('createTokens', () => {
        it('signs the pair with the persisted ownership id and the caller login time', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const accessPayload: IAuthJwtAccessTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: user.email,
                username: user.username,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                roleId: user.roleId,
            };
            const refreshPayload: IAuthJwtRefreshTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
            };
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            const result = service.createTokens(
                user,
                {
                    sessionId: 'session-1',
                    jti: 'jti-value',
                    deviceOwnershipId: 'device-ownership-1',
                    loginAt,
                },
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );

            expect(result).toEqual(tokens);
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                1,
                accessPayload,
                expect.objectContaining({
                    jwtid: 'jti-value',
                    subject: user.id,
                })
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                refreshPayload,
                expect.objectContaining({
                    jwtid: 'jti-value',
                    subject: user.id,
                })
            );
            expect(helperDateService.create).not.toHaveBeenCalled();
        });
    });

    describe('refreshToken', () => {
        it('rotates the token pair reusing the session and jti', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const oldExpSeconds = Math.floor(
                new Date('2026-01-08T00:00:00.000Z').getTime() / 1000
            );
            const decodedRefresh: IAuthJwtRefreshTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                exp: oldExpSeconds,
            };
            jwtService.decode.mockReturnValue(decodedRefresh);
            authUtil.generateJti.mockReturnValue('new-jti');
            const newAccessPayload: IAuthJwtAccessTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: user.email,
                username: user.username,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                roleId: user.roleId,
            };
            const newRefreshPayload: IAuthJwtRefreshTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
            };
            const today = new Date('2026-01-02T00:00:00.000Z');
            const expiredAt = new Date('2026-01-08T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperDateService.createFromTimestamp.mockReturnValue(expiredAt);
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ seconds: 518400 })
            );
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            const result = service.refreshToken(user, 'old-refresh-token');

            expect(result).toEqual({
                tokens,
                jti: 'new-jti',
                sessionId: 'session-1',
            });
            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                oldExpSeconds * 1000
            );
            expect(helperDateService.diff).toHaveBeenCalledWith(
                expiredAt,
                today
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                1,
                newAccessPayload,
                expect.objectContaining({
                    jwtid: 'new-jti',
                    subject: user.id,
                })
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                newRefreshPayload,
                expect.objectContaining({ expiresIn: 518400 })
            );
        });

        it('passes a missing expiry to the remaining-seconds calculation as null', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const decodedRefresh: IAuthJwtRefreshTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
            };
            jwtService.decode.mockReturnValue(decodedRefresh);
            authUtil.generateJti.mockReturnValue('new-jti');
            helperDateService.create.mockReturnValue(
                new Date('2026-01-02T00:00:00.000Z')
            );
            helperDateService.createFromTimestamp.mockReturnValue(
                new Date('1970-01-01T00:00:00.000Z')
            );
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ milliseconds: 2500 })
            );
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            service.refreshToken(user, 'old-refresh-token');

            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                0
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                expect.anything(),
                expect.objectContaining({ expiresIn: 2 })
            );
        });
    });

    describe('parseRequiredBase64Der', () => {
        it('throws when the configured key is missing', () => {
            configGet.mockImplementation((key: string) =>
                key === 'auth.jwt.accessToken.privateKey'
                    ? undefined
                    : configValues[key]
            );

            expect(() =>
                service['parseRequiredBase64Der'](
                    'auth.jwt.accessToken.privateKey',
                    EnumHelperPemLabel.privateKey,
                    'PKCS#8 DER private key'
                )
            ).toThrow(AuthJwtConfigMissingException);
            expect(() =>
                service['parseRequiredBase64Der'](
                    'auth.jwt.accessToken.privateKey',
                    EnumHelperPemLabel.privateKey,
                    'PKCS#8 DER private key'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.privateKey is missing.'
            );
        });

        it('throws when the kit helper rejects the private key bytes', () => {
            helperEncryptionService.derBase64ToPem.mockImplementation(() => {
                throw new Error('bad der');
            });

            expect(() =>
                service['parseRequiredBase64Der'](
                    'auth.jwt.accessToken.privateKey',
                    EnumHelperPemLabel.privateKey,
                    'PKCS#8 DER private key'
                )
            ).toThrow(AuthJwtConfigInvalidException);
            expect(() =>
                service['parseRequiredBase64Der'](
                    'auth.jwt.accessToken.privateKey',
                    EnumHelperPemLabel.privateKey,
                    'PKCS#8 DER private key'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.privateKey must be a valid base64-encoded PKCS#8 DER private key.'
            );
        });

        it('throws when the kit helper rejects the public key bytes', () => {
            helperEncryptionService.derBase64ToPem.mockImplementation(() => {
                throw new Error('bad der');
            });

            expect(() =>
                service['parseRequiredBase64Der'](
                    'auth.jwt.accessToken.publicKey',
                    EnumHelperPemLabel.publicKey,
                    'SPKI DER public key'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.publicKey must be a valid base64-encoded SPKI DER public key.'
            );
        });

        it('frames the configured key through the kit helper under the label', () => {
            const result = service['parseRequiredBase64Der'](
                'auth.jwt.accessToken.publicKey',
                EnumHelperPemLabel.publicKey,
                'SPKI DER public key'
            );

            expect(result).toBe(`pem(PUBLIC KEY:${accessPublicKeyBase64})`);
            expect(helperEncryptionService.derBase64ToPem).toHaveBeenCalledWith(
                accessPublicKeyBase64,
                EnumHelperPemLabel.publicKey
            );
        });
    });

    describe('createPayloadAccessToken', () => {
        it('assembles the access token payload from the user and login context', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');

            const result = service['createPayloadAccessToken'](
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

            const result = service['createPayloadRefreshToken'](accessPayload);

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

    describe('toToken', () => {
        it('shapes the bearer token pair with the role type and the access expiry', () => {
            const result = service['toToken'](
                user,
                'signed-access-token',
                'signed-refresh-token',
                900
            );

            expect(result).toEqual({
                tokenType: 'Bearer',
                roleKey: EnumRolePlatformKey.user,
                expiresIn: 900,
                accessToken: 'signed-access-token',
                refreshToken: 'signed-refresh-token',
            });
        });
    });

    describe('remainingSeconds', () => {
        it('returns the whole seconds between now and the expiry', () => {
            const today = new Date('2026-01-02T00:00:00.000Z');
            const expiredAt = new Date('2026-01-08T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperDateService.createFromTimestamp.mockReturnValue(expiredAt);
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ seconds: 518400 })
            );

            const result = service['remainingSeconds'](
                Math.floor(expiredAt.getTime() / 1000)
            );

            expect(result).toBe(518400);
            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                expiredAt.getTime()
            );
            expect(helperDateService.diff).toHaveBeenCalledWith(
                expiredAt,
                today
            );
        });

        it('falls back to milliseconds when the duration carries no whole seconds', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.createFromTimestamp.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ milliseconds: 2500 })
            );

            expect(service['remainingSeconds'](1)).toBe(2);
        });

        it('treats a missing expiry as the epoch', () => {
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.createFromTimestamp.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.diff.mockReturnValue(
                Duration.fromObject({ milliseconds: 0 })
            );

            service['remainingSeconds'](null);

            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                0
            );
        });
    });
});
