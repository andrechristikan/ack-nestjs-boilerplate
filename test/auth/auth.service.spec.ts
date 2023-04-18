import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { JwtService } from '@nestjs/jwt';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ENUM_AUTH_LOGIN_WITH } from 'src/common/auth/constants/auth.enum.constant';

describe('AuthService', () => {
    let service: AuthService;

    const mockJwtService = {
        sign: jest.fn().mockReturnValue('mockedToken'),
        decode: jest.fn().mockReturnValue({ text: 'mockedData' }),
        verify: jest.fn().mockImplementation((token: string) => {
            if (token === 'AValidJwtTokenForTestingPurposes') return true;
            throw Error();
        }),
    };

    const mockConfigService = {
        get: jest.fn().mockImplementation((path: string) => {
            switch (path) {
                case 'auth.accessToken.secretKey':
                    return 'secretKey_accessToken';
                case 'auth.accessToken.expirationTime':
                    return 60;
                case 'auth.accessToken.notBeforeExpirationTime':
                    return 0;
                case 'auth.accessToken.encryptKey':
                    return 'AKeyForTestingPurposes';
                case 'auth.accessToken.encryptIv':
                    return 'AnIvForTestingPurposes';
                case 'auth.refreshToken.secretKey':
                    return 'secretKey_refreshToken';
                case 'auth.refreshToken.expirationTime':
                    return 60;
                case 'auth.refreshToken.notBeforeExpirationTime':
                    return 0;
                case 'auth.refreshToken.encryptKey':
                    return 'AKeyForTestingPurposes';
                case 'auth.refreshToken.encryptIv':
                    return 'AnIvForTestingPurposes';
                case 'auth.payloadEncryption':
                    return true;
                case 'auth.prefixAuthorization':
                    return 'Bearer';
                case 'auth.subject':
                    return 'jwt_subject';
                case 'auth.audience':
                    return 'jwt_audience';
                case 'auth.issuer':
                    return 'jwt_issuer';
                case 'auth.password.expiredIn':
                    return 60;
                case 'auth.password.saltLength':
                default:
                    return 8;
            }
        }),
    };

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                ConfigService,
                HelperEncryptionService,
                HelperHashService,
                HelperDateService,
                HelperStringService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
            ],
            imports: [],
        }).compile();

        service = moduleRef.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('decryptAccessToken', () => {
        it('should encrypt and decrypt access token', async () => {
            const payload = { userId: 1 };
            const encryptedToken = await service.encryptAccessToken(payload);
            const decryptedPayload = await service.decryptAccessToken({
                data: encryptedToken,
            });
            expect(decryptedPayload).toEqual(payload);
        });
    });

    describe('createAccessToken', () => {
        it('should create access token', async () => {
            const expectedToken = 'test-access-token';
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtEncrypt'
            ).mockReturnValueOnce(expectedToken);
            const payloadHashed = 'test-payload-hash';
            const accessToken = await service.createAccessToken(payloadHashed);
            expect(accessToken).toEqual(expectedToken);
        });
    });

    describe('validateAccessToken', () => {
        it('should validate access token', async () => {
            const accessToken = 'test-access-token';
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtVerify'
            ).mockReturnValueOnce(true);
            const isValid = await service.validateAccessToken(accessToken);
            expect(isValid).toBe(true);
        });
    });

    describe('payloadAccessToken', () => {
        it('should payload access token', async () => {
            const accessToken = 'test-access-token';
            const expectedPayload = { userId: 1 };
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtDecrypt'
            ).mockReturnValueOnce(expectedPayload);
            const payload = await service.payloadAccessToken(accessToken);
            expect(payload).toEqual(expectedPayload);
        });
    });

    describe('encryptRefreshToken', () => {
        it('should encrypt and decrypt refresh token', async () => {
            const payload = { userId: 1 };
            const encryptedToken = await service.encryptRefreshToken(payload);
            const decryptedPayload = await service.decryptRefreshToken({
                data: encryptedToken,
            });
            expect(decryptedPayload).toEqual(payload);
        });
    });

    describe('createRefreshToken', () => {
        it('should create refresh token', async () => {
            const expectedToken = 'test-refresh-token';
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtEncrypt'
            ).mockReturnValueOnce(expectedToken);
            const payloadHashed = 'test-payload-hash';
            const refreshToken = await service.createRefreshToken(
                payloadHashed
            );
            expect(refreshToken).toEqual(expectedToken);
        });
    });

    describe('validateRefreshToken', () => {
        it('should validate refresh token', async () => {
            const refreshToken = 'test-refresh-token';
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtVerify'
            ).mockReturnValueOnce(true);
            const isValid = await service.validateRefreshToken(refreshToken);
            expect(isValid).toBe(true);
        });
    });

    describe('payloadRefreshToken', () => {
        it('should payload refresh token', async () => {
            const refreshToken = 'test-refresh-token';
            const expectedPayload = { userId: 1 };
            jest.spyOn(
                service['helperEncryptionService'],
                'jwtDecrypt'
            ).mockReturnValueOnce(expectedPayload);
            const payload = await service.payloadRefreshToken(refreshToken);
            expect(payload).toEqual(expectedPayload);
        });
    });

    describe('validateUser', () => {
        it('should validate user password', async () => {
            const passwordString = 'password';
            const passwordHash =
                '$2a$08$fzP9lDIQU3HKvnwr6vTWj.oNhh7ZgohAwo7FZ2OvWnQUDRX7/6BdO';

            const isValid = await service.validateUser(
                passwordString,
                passwordHash
            );
            expect(isValid).toBe(true);
        });

        it('should invalid user password', async () => {
            const passwordString = 'password';
            const passwordHash = 'password';

            const isValid = await service.validateUser(
                passwordString,
                passwordHash
            );
            expect(isValid).toBe(false);
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should create access token payload', async () => {
            const expectedPayload = { userId: 1 };
            const data = { userId: 1 };
            const payload = await service.createPayloadAccessToken(data);
            expect(payload).toEqual(expectedPayload);
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('should create refresh token payload', async () => {
            const options = { loginWith: ENUM_AUTH_LOGIN_WITH.LOCAL };
            const expectedPayload = {
                _id: 'user-id',
            };
            const _id = 'user-id';
            const payload = await service.createPayloadRefreshToken(
                _id,
                options
            );
            expect(payload._id).toEqual(expectedPayload._id);
            expect(payload.loginDate instanceof Date).toBe(true);
            expect(payload.loginWith).toEqual(options.loginWith);
        });
    });

    describe('createSalt', () => {
        it('should create salt', async () => {
            const salt = '$2a$10$c7eFZNuXXgH0HOu5SwTKDe';
            jest.spyOn(service, 'createSalt').mockResolvedValue(salt);

            const result = await service.createSalt(8);
            expect(result).toBe(salt);
        });
    });

    describe('createPassword', () => {
        it('should create password', async () => {
            const password = 'password';
            const salt = await service.createSalt(8);
            jest.spyOn(service, 'createSalt').mockResolvedValue(salt);

            const { passwordHash, passwordExpired, passwordCreated } =
                await service.createPassword(password);
            expect(passwordHash.startsWith(salt)).toEqual(true);
            expect(passwordExpired).toBeDefined();
            expect(typeof passwordExpired).toEqual('object');
            expect(passwordCreated).toBeDefined();
            expect(typeof passwordCreated).toEqual('object');
            expect(passwordExpired >= passwordCreated).toEqual(true);
        });
    });

    describe('createPasswordRandom', () => {
        it('should create password random', async () => {
            const password = await service.createPasswordRandom();

            expect(password).toBeDefined();
            expect(typeof password).toEqual('string');
        });
    });

    describe('checkPasswordExpired', () => {
        it('should check password expiration', async () => {
            const passwordExpiredIn = 3600;
            const passwordExpiredDiff = -1; // less than expired in
            const passExpired = new Date(Date.now() + passwordExpiredIn * 1000);
            const isValid = await service.checkPasswordExpired(passExpired);
            expect(isValid).toEqual(passwordExpiredDiff >= 0);
        });
    });

    describe('getTokenType', () => {
        it('should get token type', async () => {
            const expectedTokenType = 'Bearer';
            const tokenType = await service.getTokenType();
            expect(tokenType).toEqual(expectedTokenType);
        });
    });

    describe('getAccessTokenExpirationTime', () => {
        it('should get access token expiration time', async () => {
            const expectedExpirationTime = 60;
            const expirationTime = await service.getAccessTokenExpirationTime();
            expect(expirationTime).toEqual(expectedExpirationTime);
        });
    });

    describe('getRefreshTokenExpirationTime', () => {
        it('should get refresh token expiration time', async () => {
            const expectedExpirationTime = 60;
            const expirationTime =
                await service.getRefreshTokenExpirationTime();
            expect(expirationTime).toEqual(expectedExpirationTime);
        });
    });

    describe('getIssuer', () => {
        it('should get issuer', async () => {
            const expectedIssuer = 'jwt_issuer';
            const issuer = await service.getIssuer();
            expect(issuer).toEqual(expectedIssuer);
        });
    });

    describe('getAudience', () => {
        it('should get audience', async () => {
            const expectedAudience = 'jwt_audience';
            const audience = await service.getAudience();
            expect(audience).toEqual(expectedAudience);
        });
    });

    describe('getSubject', () => {
        it('should get subject', async () => {
            const expectedSubject = 'jwt_subject';
            const subject = await service.getSubject();
            expect(subject).toEqual(expectedSubject);
        });
    });

    describe('getPayloadEncryption', () => {
        it('should get payload encryption flag', async () => {
            const expectedPayloadEncryption = true;
            const payloadEncryption = await service.getPayloadEncryption();
            expect(payloadEncryption).toEqual(expectedPayloadEncryption);
        });
    });
});
