import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { generateKeyPairSync } from 'node:crypto';
import { Duration } from 'luxon';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
    EnumUserSignUpFrom,
    EnumUserSignUpWith,
    EnumUserStatus,
} from '@generated/prisma-client/client';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperDateService } from '@common/helper/services/helper.date.service';
import { AuthJwtDomain } from '@modules/auth/domains/auth.jwt.domain';
import { AuthUtil } from '@modules/auth/utils/auth.util';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
} from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';

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
const invalidKeyBase64 = Buffer.from('not-a-real-key').toString('base64');

describe('AuthJwtDomain', () => {
    const databaseUtil: MockProxy<DatabaseUtil> = mock<DatabaseUtil>();
    const helperDateService: MockProxy<HelperDateService> =
        mock<HelperDateService>();
    const jwtService: MockProxy<JwtService> = mock<JwtService>();
    const authUtil: MockProxy<AuthUtil> = mock<AuthUtil>();
    const configGet = vi.fn<(key: string) => string | number | undefined>();
    const configService: MockProxy<ConfigService> = mock<ConfigService>({
        get: configGet as ConfigService['get'],
    });

    let domain: AuthJwtDomain;

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
        passwordAttempt: null,
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
        termPolicy: {
            termsOfService: true,
            privacy: true,
            marketing: false,
            cookies: true,
        },
        photo: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        createdBy: null,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        role: {
            id: 'role-1',
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

    const configValues: Record<string, string | number> = {
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.expirationTimeInSeconds': 900,
        'auth.jwt.refreshToken.kid': 'refresh-kid',
        'auth.jwt.refreshToken.expirationTimeInSeconds': 604800,
        'auth.jwt.accessToken.privateKey': accessPrivateKeyBase64,
        'auth.jwt.accessToken.publicKey': accessPublicKeyBase64,
        'auth.jwt.accessToken.algorithm': 'ES256',
        'auth.jwt.refreshToken.privateKey': refreshPrivateKeyBase64,
        'auth.jwt.refreshToken.publicKey': refreshPublicKeyBase64,
        'auth.jwt.refreshToken.algorithm': 'ES512',
        'auth.jwt.prefix': 'Bearer',
        'auth.jwt.audience': 'aud',
        'auth.jwt.issuer': 'iss',
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        configGet.mockImplementation((key: string) => configValues[key]);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthJwtDomain,
                { provide: DatabaseUtil, useValue: databaseUtil },
                { provide: HelperDateService, useValue: helperDateService },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
                { provide: AuthUtil, useValue: authUtil },
            ],
        }).compile();

        domain = module.get(AuthJwtDomain);
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

            const result = domain.createAccessToken(
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

            const result = domain.createRefreshToken(
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

            domain.createRefreshToken('user-1', 'jti-value', payload, 1234);

            expect(jwtService.sign).toHaveBeenCalledWith(
                payload,
                expect.objectContaining({ expiresIn: 1234 })
            );
        });
    });

    describe('validateAccessToken', () => {
        it('returns true when verification succeeds', () => {
            jwtService.verify.mockReturnValue({});

            const result = domain.validateAccessToken(
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

            const result = domain.validateAccessToken(
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

            const result = domain.validateRefreshToken(
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

            const result = domain.validateRefreshToken(
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

            const result = domain.payloadToken<typeof decoded>('token');

            expect(result).toBe(decoded);
            expect(jwtService.decode).toHaveBeenCalledWith('token');
        });
    });

    describe('createTokens', () => {
        it('creates the access and refresh token pair for a fresh login', () => {
            const loginDate = new Date('2026-01-01T00:00:00.000Z');
            helperDateService.create.mockReturnValue(loginDate);
            databaseUtil.createId
                .mockReturnValueOnce('session-1')
                .mockReturnValueOnce('device-ownership-1');
            authUtil.generateJti.mockReturnValue('jti-value');
            const accessPayload: IAuthJwtAccessTokenPayload = {
                loginAt: loginDate,
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
                loginAt: loginDate,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
            };
            authUtil.createPayloadAccessToken.mockReturnValue(accessPayload);
            authUtil.createPayloadRefreshToken.mockReturnValue(refreshPayload);
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            const result = domain.createTokens(
                user,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );

            expect(result).toEqual({
                tokens: {
                    tokenType: 'Bearer',
                    roleType: EnumRoleType.user,
                    expiresIn: 900,
                    accessToken: 'signed-access-token',
                    refreshToken: 'signed-refresh-token',
                },
                jti: 'jti-value',
                sessionId: 'session-1',
            });
            expect(authUtil.createPayloadAccessToken).toHaveBeenCalledWith(
                user,
                'session-1',
                'device-ownership-1',
                loginDate,
                EnumUserLoginFrom.website,
                EnumUserLoginWith.credential
            );
            expect(authUtil.createPayloadRefreshToken).toHaveBeenCalledWith(
                accessPayload
            );
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
            authUtil.createPayloadAccessToken.mockReturnValue(newAccessPayload);
            authUtil.createPayloadRefreshToken.mockReturnValue(
                newRefreshPayload
            );
            const today = new Date('2026-01-02T00:00:00.000Z');
            const expiredAt = new Date('2026-01-08T00:00:00.000Z');
            helperDateService.create.mockReturnValue(today);
            helperDateService.createFromTimestamp.mockReturnValue(expiredAt);
            const diff = Duration.fromObject({ seconds: 518400 });
            helperDateService.diff.mockReturnValue(diff);
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            const result = domain.refreshToken(user, 'old-refresh-token');

            expect(result).toEqual({
                tokens: {
                    tokenType: 'Bearer',
                    roleType: EnumRoleType.user,
                    expiresIn: 900,
                    accessToken: 'signed-access-token',
                    refreshToken: 'signed-refresh-token',
                },
                jti: 'new-jti',
                sessionId: 'session-1',
                expiredInMs: diff.milliseconds,
            });
            expect(helperDateService.createFromTimestamp).toHaveBeenCalledWith(
                oldExpSeconds * 1000
            );
            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                newRefreshPayload,
                expect.objectContaining({ expiresIn: 518400 })
            );
        });

        it('falls back to milliseconds when the duration carries no whole seconds', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            const decodedRefresh: IAuthJwtRefreshTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                exp: undefined,
            };
            jwtService.decode.mockReturnValue(decodedRefresh);
            authUtil.generateJti.mockReturnValue('new-jti');
            authUtil.createPayloadAccessToken.mockReturnValue({
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                email: user.email,
                username: user.username,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
                roleId: user.roleId,
            });
            authUtil.createPayloadRefreshToken.mockReturnValue({
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
                userId: user.id,
                sessionId: 'session-1',
                deviceOwnershipId: 'device-ownership-1',
            });
            helperDateService.create.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            helperDateService.createFromTimestamp.mockReturnValue(
                new Date('2026-01-01T00:00:00.000Z')
            );
            const diff = Duration.fromObject({ milliseconds: 2500 });
            helperDateService.diff.mockReturnValue(diff);
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            domain.refreshToken(user, 'old-refresh-token');

            expect(jwtService.sign).toHaveBeenNthCalledWith(
                2,
                expect.anything(),
                expect.objectContaining({ expiresIn: 2 })
            );
        });
    });

    describe('parseRequiredBase64DerPrivateKey', () => {
        it('throws when the configured key is missing', () => {
            configGet.mockImplementation((key: string) =>
                key === 'auth.jwt.accessToken.privateKey'
                    ? undefined
                    : configValues[key]
            );

            expect(() =>
                domain['parseRequiredBase64DerPrivateKey'](
                    'auth.jwt.accessToken.privateKey'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.privateKey is missing.'
            );
        });

        it('throws when the configured key is not a valid PKCS#8 DER private key', () => {
            configGet.mockImplementation((key: string) =>
                key === 'auth.jwt.accessToken.privateKey'
                    ? invalidKeyBase64
                    : configValues[key]
            );

            expect(() =>
                domain['parseRequiredBase64DerPrivateKey'](
                    'auth.jwt.accessToken.privateKey'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.privateKey must be a valid base64-encoded PKCS#8 DER private key.'
            );
        });

        it('returns the PEM-exported private key when valid', () => {
            const result = domain['parseRequiredBase64DerPrivateKey'](
                'auth.jwt.accessToken.privateKey'
            );

            expect(result).toContain('BEGIN PRIVATE KEY');
        });
    });

    describe('parseRequiredBase64DerPublicKey', () => {
        it('throws when the configured key is missing', () => {
            configGet.mockImplementation((key: string) =>
                key === 'auth.jwt.accessToken.publicKey'
                    ? undefined
                    : configValues[key]
            );

            expect(() =>
                domain['parseRequiredBase64DerPublicKey'](
                    'auth.jwt.accessToken.publicKey'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.publicKey is missing.'
            );
        });

        it('throws when the configured key is not a valid SPKI DER public key', () => {
            configGet.mockImplementation((key: string) =>
                key === 'auth.jwt.accessToken.publicKey'
                    ? invalidKeyBase64
                    : configValues[key]
            );

            expect(() =>
                domain['parseRequiredBase64DerPublicKey'](
                    'auth.jwt.accessToken.publicKey'
                )
            ).toThrow(
                'Invalid JWT configuration: auth.jwt.accessToken.publicKey must be a valid base64-encoded SPKI DER public key.'
            );
        });

        it('returns the PEM-exported public key when valid', () => {
            const result = domain['parseRequiredBase64DerPublicKey'](
                'auth.jwt.accessToken.publicKey'
            );

            expect(result).toContain('BEGIN PUBLIC KEY');
        });
    });
});
