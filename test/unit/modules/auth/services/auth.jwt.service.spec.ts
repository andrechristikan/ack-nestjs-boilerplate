import { EnumHelperPemLabel } from '@common/helper/enums/helper.enum';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';
import { generateKeyPairSync } from 'node:crypto';
import {
    EnumRoleType,
    EnumUserLoginFrom,
    EnumUserLoginWith,
} from '@generated/prisma-client/client';
import { AuthJwtService } from '@modules/auth/services/auth.jwt.service';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { DatabaseUtil } from '@common/database/utils/database.util';
import { HelperStringService } from '@common/helper/services/helper.string.service';
import type {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthToken,
} from '@modules/auth/interfaces/auth.interface';
import type { IUser } from '@modules/user/interfaces/user.interface';
import { AuthJwtConfigInvalidException } from '@modules/auth/exceptions/auth.jwt-config-invalid.exception';
import { AuthJwtConfigMissingException } from '@modules/auth/exceptions/auth.jwt-config-missing.exception';
import {
    TestUnitKitConfigValues,
    TestUnitKitProviders,
} from '@test/unit/helpers/test.unit.kit.helper';
import {
    buildConfigService,
    stubConfigValues,
} from '@test/unit/helpers/test.unit.config.helper';
import { buildUser } from '@test/unit/helpers/test.unit.request.helper';

const accessKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const accessPrivateKeyBase64 = accessKeyPair.privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');
const refreshKeyPair = generateKeyPairSync('ec', { namedCurve: 'P-521' });
const refreshPrivateKeyBase64 = refreshKeyPair.privateKey
    .export({ type: 'pkcs8', format: 'der' })
    .toString('base64');

describe('AuthJwtService', () => {
    const jwtService: MockProxy<JwtService> = mock<JwtService>();
    let configService: MockProxy<ConfigService>;
    let helperStringService: HelperStringService;
    let databaseUtil: DatabaseUtil;

    let service: AuthJwtService;

    const user: IUser = buildUser('user-1', 'jane@example.com');

    const tokens: IAuthToken = {
        tokenType: 'Bearer',
        roleType: EnumRoleType.user,
        expiresIn: 900,
        accessToken: 'signed-access-token',
        refreshToken: 'signed-refresh-token',
    };

    const configValues: Record<string, unknown> = {
        ...TestUnitKitConfigValues,
        'auth.jwt.jtiLength': 32,
        'auth.jwt.accessToken.kid': 'access-kid',
        'auth.jwt.accessToken.expiresInSeconds': 900,
        'auth.jwt.refreshToken.kid': 'refresh-kid',
        'auth.jwt.refreshToken.expiresInSeconds': 604800,
        'auth.jwt.accessToken.privateKey': accessPrivateKeyBase64,
        'auth.jwt.accessToken.algorithm': 'ES256',
        'auth.jwt.refreshToken.privateKey': refreshPrivateKeyBase64,
        'auth.jwt.refreshToken.algorithm': 'ES512',
        'auth.jwt.audience': 'aud',
        'auth.jwt.issuer': 'iss',
    };

    beforeAll(() => {
        vi.useFakeTimers();
    });

    beforeEach(async () => {
        configService = buildConfigService(configValues);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ...TestUnitKitProviders,
                AuthJwtService,
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get(AuthJwtService);
        helperStringService = module.get(HelperStringService);
        databaseUtil = module.get(DatabaseUtil);
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    describe('createAccessToken', () => {
        it('signs the payload with the access private key and options', () => {
            jwtService.sign.mockReturnValue('signed-access-token');
            const payload: IAuthJwtAccessTokenPayload = {
                loginAt: new Date('2026-01-01T00:00:00.000Z'),
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
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
                payload,
                null
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
        });
    });

    describe('createLoginIdentifiers', () => {
        it('mints a session id and a jti of the configured length', () => {
            const createId = vi
                .spyOn(databaseUtil, 'createId')
                .mockReturnValue('session-1');
            const random = vi
                .spyOn(helperStringService, 'random')
                .mockReturnValue('jti-value');

            const result = service.createLoginIdentifiers();

            expect(result).toEqual({
                sessionId: 'session-1',
                jti: 'jti-value',
            });
            expect(createId).toHaveBeenCalledTimes(1);
            expect(random).toHaveBeenCalledWith(32);
        });
    });

    describe('refreshToken', () => {
        it('rotates the token pair reusing the session and jti', () => {
            const loginAt = new Date('2026-01-01T00:00:00.000Z');
            vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
            const oldExpSeconds = 1767830400;
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
            vi.spyOn(helperStringService, 'random').mockReturnValue('new-jti');
            const newAccessPayload: IAuthJwtAccessTokenPayload = {
                loginAt,
                loginFrom: EnumUserLoginFrom.website,
                loginWith: EnumUserLoginWith.credential,
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
            jwtService.sign
                .mockReturnValueOnce('signed-access-token')
                .mockReturnValueOnce('signed-refresh-token');

            const result = service.refreshToken(user, 'old-refresh-token');

            expect(result).toEqual({
                tokens,
                jti: 'new-jti',
                sessionId: 'session-1',
            });
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

        it('rejects a refresh token carrying no expiry and signs nothing', () => {
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

            expect(() =>
                service.refreshToken(user, 'old-refresh-token')
            ).toThrow(
                expect.objectContaining({
                    module: 'auth',
                    statusCode: EnumAuthStatusCodeError.jwtRefreshTokenInvalid,
                })
            );
            expect(jwtService.sign).not.toHaveBeenCalled();
        });
    });

    describe('parseRequiredBase64Der', () => {
        it('throws when the configured key is missing', () => {
            stubConfigValues(configService, {
                ...configValues,
                'auth.jwt.accessToken.privateKey': undefined,
            });

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
            stubConfigValues(configService, {
                ...configValues,
                'auth.jwt.accessToken.privateKey': 'AAAA',
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

        it('frames the configured key through the kit helper under the label', () => {
            const result = service['parseRequiredBase64Der'](
                'auth.jwt.accessToken.privateKey',
                EnumHelperPemLabel.privateKey,
                'PKCS#8 DER private key'
            );

            expect(result).toBe(
                accessKeyPair.privateKey.export({
                    type: 'pkcs8',
                    format: 'pem',
                })
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
                roleType: EnumRoleType.user,
                expiresIn: 900,
                accessToken: 'signed-access-token',
                refreshToken: 'signed-refresh-token',
            });
        });
    });

    describe('remainingSeconds', () => {
        it('returns the whole seconds between now and the expiry', () => {
            vi.setSystemTime(new Date('2026-01-02T00:00:00.000Z'));

            const result = service['remainingSeconds'](1767830400);

            expect(result).toBe(518400);
        });

        it('floors a sub-second remainder to whole seconds', () => {
            vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

            expect(service['remainingSeconds'](1767225602.5)).toBe(2);
        });
    });
});
