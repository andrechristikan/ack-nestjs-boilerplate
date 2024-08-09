import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { plainToInstance } from 'class-transformer';
import { AuthJwtAccessPayloadDto } from 'src/modules/auth/dtos/jwt/auth.jwt.access-payload.dto';
import verifyAppleToken from 'verify-apple-id-token';
import { OAuth2Client } from 'google-auth-library';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';

jest.mock('verify-apple-id-token');

describe('AuthService', () => {
    let service: AuthService;
    let helperHashService: HelperHashService;
    let helperDateService: HelperDateService;
    let helperStringService: HelperStringService;
    let helperEncryptionService: HelperEncryptionService;
    let configService: ConfigService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: HelperHashService,
                    useValue: {
                        bcryptCompare: jest.fn(),
                        randomSalt: jest.fn(),
                        bcrypt: jest.fn(),
                    },
                },
                {
                    provide: HelperDateService,
                    useValue: {
                        create: jest.fn(),
                        forwardInSeconds: jest.fn(),
                    },
                },
                {
                    provide: HelperStringService,
                    useValue: {
                        random: jest.fn(),
                    },
                },
                {
                    provide: HelperEncryptionService,
                    useValue: {
                        jwtEncrypt: jest.fn(),
                        jwtVerify: jest.fn(),
                        jwtDecrypt: jest.fn(),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            const config = {
                                'auth.jwt.accessToken.secretKey': 'secretKey',
                                'auth.jwt.accessToken.expirationTime': 3600,
                                'auth.jwt.refreshToken.secretKey':
                                    'refreshSecretKey',
                                'auth.jwt.refreshToken.expirationTime': 7200,
                                'auth.jwt.prefixAuthorization': 'Bearer',
                                'auth.jwt.subject': 'subject',
                                'auth.jwt.audience': 'audience',
                                'auth.jwt.issuer': 'issuer',
                                'auth.password.expiredIn': 3600,
                                'auth.password.expiredInTemporary': 1800,
                                'auth.password.saltLength': 16,
                                'auth.password.attempt': true,
                                'auth.password.maxAttempt': 5,
                                'auth.apple.clientId': 'appleClientId',
                                'auth.apple.signInClientId':
                                    'appleSignInClientId',
                                'auth.google.clientId': 'googleClientId',
                                'auth.google.clientSecret':
                                    'googleClientSecret',
                            };
                            return config[key];
                        }),
                    },
                },
                {
                    provide: OAuth2Client,
                    useValue: {
                        verifyIdToken: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        helperHashService = module.get<HelperHashService>(HelperHashService);
        helperDateService = module.get<HelperDateService>(HelperDateService);
        helperStringService =
            module.get<HelperStringService>(HelperStringService);
        helperEncryptionService = module.get<HelperEncryptionService>(
            HelperEncryptionService
        );
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAccessToken', () => {
        it('should create an access token', async () => {
            const payload: any = {
                _id: '123',
            };
            const token: string = 'some.jwt.token';

            jest.spyOn(helperEncryptionService, 'jwtEncrypt').mockReturnValue(
                token
            );

            const result = await service.createAccessToken('subject', payload);
            expect(result).toBe(token);
            expect(helperEncryptionService.jwtEncrypt).toHaveBeenCalledWith(
                { ...payload },
                {
                    secretKey: 'secretKey',
                    expiredIn: 3600,
                    audience: 'audience',
                    issuer: 'issuer',
                    subject: 'subject',
                }
            );
        });
    });

    describe('validateAccessToken', () => {
        it('should validate an access token', async () => {
            const payload: any = {
                _id: '123',
            };

            jest.spyOn(helperEncryptionService, 'jwtVerify').mockReturnValue(
                true
            );

            const result = await service.validateAccessToken(
                'subject',
                payload
            );
            expect(result).toBe(true);
            expect(helperEncryptionService.jwtVerify).toHaveBeenCalledWith(
                { ...payload },
                {
                    secretKey: 'secretKey',
                    audience: 'audience',
                    issuer: 'issuer',
                    subject: 'subject',
                }
            );
        });
    });

    describe('payloadAccessToken', () => {
        it('should decrypt an access token', async () => {
            jest.spyOn(helperEncryptionService, 'jwtDecrypt').mockReturnValue(
                {}
            );

            const result = await service.payloadAccessToken('token');
            expect(result).toEqual({});
            expect(helperEncryptionService.jwtDecrypt).toHaveBeenCalledWith(
                'token'
            );
        });
    });

    describe('createRefreshToken', () => {
        it('should create a new access token', async () => {
            const payload: any = {
                _id: '123',
            };
            const token: string = 'some.jwt.token';

            jest.spyOn(helperEncryptionService, 'jwtEncrypt').mockReturnValue(
                token
            );

            const result = await service.createRefreshToken('subject', payload);
            expect(result).toBe(token);
            expect(helperEncryptionService.jwtEncrypt).toHaveBeenCalledWith(
                { ...payload },
                {
                    secretKey: 'refreshSecretKey',
                    expiredIn: 7200,
                    audience: 'audience',
                    issuer: 'issuer',
                    subject: 'subject',
                }
            );
        });
    });

    describe('validateRefreshToken', () => {
        it('should validate a new access token', async () => {
            const payload: any = {
                _id: '123',
            };

            jest.spyOn(helperEncryptionService, 'jwtVerify').mockReturnValue(
                true
            );

            const result = await service.validateRefreshToken(
                'subject',
                payload
            );
            expect(result).toBe(true);
            expect(helperEncryptionService.jwtVerify).toHaveBeenCalledWith(
                { ...payload },
                {
                    secretKey: 'refreshSecretKey',
                    audience: 'audience',
                    issuer: 'issuer',
                    subject: 'subject',
                }
            );
        });
    });

    describe('payloadRefreshToken', () => {
        it('should decrypt a new access token', async () => {
            jest.spyOn(helperEncryptionService, 'jwtDecrypt').mockReturnValue(
                {}
            );

            const result = await service.payloadRefreshToken('token');
            expect(result).toEqual({});
            expect(helperEncryptionService.jwtDecrypt).toHaveBeenCalledWith(
                'token'
            );
        });
    });

    describe('validateUser', () => {
        it('should validate user password', async () => {
            const passwordString = 'password';
            const passwordHash = 'hashedPassword';
            jest.spyOn(helperHashService, 'bcryptCompare').mockReturnValue(
                true
            );

            const result = await service.validateUser(
                passwordString,
                passwordHash
            );
            expect(result).toBe(true);
            expect(helperHashService.bcryptCompare).toHaveBeenCalledWith(
                passwordString,
                passwordHash
            );
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should create payload access token', async () => {
            const data = {
                _id: 'userId',
                role: { type: 'user', _id: 'roleId', permissions: [] },
                email: 'test@example.com',
                toObject: jest.fn().mockReturnValue({
                    _id: 'userId',
                    role: { type: 'user', _id: 'roleId', permissions: [] },
                    email: 'test@example.com',
                }),
            };
            const loginFrom = ENUM_AUTH_LOGIN_FROM.SOCIAL_GOOGLE;
            const loginDate = new Date();
            jest.spyOn(helperDateService, 'create').mockReturnValue(loginDate);

            const result = await service.createPayloadAccessToken(
                data as any,
                loginFrom
            );
            expect(result).toEqual(
                plainToInstance(AuthJwtAccessPayloadDto, {
                    _id: 'userId',
                    type: 'user',
                    role: 'roleId',
                    email: 'test@example.com',
                    permissions: [],
                    loginDate,
                    loginFrom,
                })
            );
            expect(helperDateService.create).toHaveBeenCalled();
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('should create payload refresh token', async () => {
            const payload = {
                _id: 'userId',
                loginFrom: ENUM_AUTH_LOGIN_FROM.SOCIAL_GOOGLE,
                loginDate: new Date(),
            };

            const result = await service.createPayloadRefreshToken(
                payload as any
            );
            expect(result).toEqual(payload);
        });
    });

    describe('createSalt', () => {
        it('should create a salt', async () => {
            const length = 16;
            const salt = 'randomSalt';
            jest.spyOn(helperHashService, 'randomSalt').mockReturnValue(
                salt as any
            );

            const result = await service.createSalt(length);
            expect(result).toBe(salt);
            expect(helperHashService.randomSalt).toHaveBeenCalledWith(length);
        });
    });

    describe('createPassword', () => {
        it('should create a password', async () => {
            const password = 'password';
            const salt = 'randomSalt';
            const passwordHash = 'hashedPassword';
            const passwordExpired = new Date();
            const passwordCreated = new Date();
            jest.spyOn(service, 'createSalt').mockResolvedValue(salt);
            jest.spyOn(helperDateService, 'forwardInSeconds').mockReturnValue(
                passwordExpired
            );
            jest.spyOn(helperDateService, 'create').mockReturnValue(
                passwordCreated
            );
            jest.spyOn(helperHashService, 'bcrypt').mockReturnValue(
                passwordHash
            );

            const result = await service.createPassword(password);
            expect(result).toEqual({
                passwordHash,
                passwordExpired,
                passwordCreated,
                salt,
            });
            expect(service.createSalt).toHaveBeenCalledWith(16);
            expect(helperDateService.forwardInSeconds).toHaveBeenCalledWith(
                3600
            );
            expect(helperDateService.create).toHaveBeenCalled();
            expect(helperHashService.bcrypt).toHaveBeenCalledWith(
                password,
                salt
            );
        });

        it('should create a temporary password', async () => {
            const password = 'password';
            const salt = 'randomSalt';
            const passwordHash = 'hashedPassword';
            const passwordExpired = new Date();
            const passwordCreated = new Date();
            jest.spyOn(service, 'createSalt').mockResolvedValue(salt);
            jest.spyOn(helperDateService, 'forwardInSeconds').mockReturnValue(
                passwordExpired
            );
            jest.spyOn(helperDateService, 'create').mockReturnValue(
                passwordCreated
            );
            jest.spyOn(helperHashService, 'bcrypt').mockReturnValue(
                passwordHash
            );

            const result = await service.createPassword(password, {
                temporary: true,
            });
            expect(result).toEqual({
                passwordHash,
                passwordExpired,
                passwordCreated,
                salt,
            });
            expect(service.createSalt).toHaveBeenCalledWith(16);
            expect(helperDateService.forwardInSeconds).toHaveBeenCalledWith(
                1800
            );
            expect(helperDateService.create).toHaveBeenCalled();
            expect(helperHashService.bcrypt).toHaveBeenCalledWith(
                password,
                salt
            );
        });
    });

    describe('createPasswordRandom', () => {
        it('should create a random password', async () => {
            const randomPassword = 'randomPassword';
            jest.spyOn(helperStringService, 'random').mockReturnValue(
                randomPassword
            );

            const result = await service.createPasswordRandom();
            expect(result).toBe(randomPassword);
            expect(helperStringService.random).toHaveBeenCalledWith(10);
        });
    });

    describe('checkPasswordExpired', () => {
        it('should check if password is expired', async () => {
            const passwordExpired = new Date(Date.now() - 1000);
            const today = new Date();
            jest.spyOn(helperDateService, 'create').mockReturnValue(today);

            const result = await service.checkPasswordExpired(passwordExpired);
            expect(result).toBe(false);
            expect(helperDateService.create).toHaveBeenCalled();
        });
    });

    describe('getTokenType', () => {
        it('should return token type', async () => {
            expect(await service.getTokenType()).toEqual('Bearer');
        });
    });

    describe('getAccessTokenExpirationTime', () => {
        it('should return token expiration time', async () => {
            expect(await service.getAccessTokenExpirationTime()).toEqual(
                configService.get('auth.jwt.accessToken.expirationTime')
            );
        });
    });

    describe('getRefreshTokenExpirationTime', () => {
        it('should return refresh token expiration time', async () => {
            expect(await service.getRefreshTokenExpirationTime()).toEqual(
                configService.get('auth.jwt.refreshToken.expirationTime')
            );
        });
    });

    describe('getIssuer', () => {
        it('should return issuer', async () => {
            expect(await service.getIssuer()).toEqual(
                configService.get('auth.jwt.issuer')
            );
        });
    });

    describe('getAudience', () => {
        it('should return audience', async () => {
            expect(await service.getAudience()).toEqual(
                configService.get('auth.jwt.audience')
            );
        });
    });

    describe('getPasswordAttempt', () => {
        it('should return password attempt', async () => {
            expect(await service.getPasswordAttempt()).toEqual(
                configService.get('auth.password.attempt')
            );
        });
    });

    describe('getPasswordMaxAttempt', () => {
        it('should return max password attempt', async () => {
            expect(await service.getPasswordMaxAttempt()).toEqual(
                configService.get('auth.password.maxAttempt')
            );
        });
    });

    describe('appleGetTokenInfo', () => {
        it('should return apple token info', async () => {
            const result = { email: 'akan@kadence.com' };
            (verifyAppleToken as jest.Mock).mockReturnValue(result);

            expect(await service.appleGetTokenInfo('idToken')).toEqual(result);
        });
    });

    describe('googleGetTokenInfo', () => {
        it('should get Google token info', async () => {
            const idToken = 'idToken';
            const email = 'test@example.com';
            const mockPayload = { email };
            const mockLoginTicket = {
                getPayload: jest.fn().mockReturnValue(mockPayload),
            };

            jest.spyOn(
                service['googleClient'],
                'verifyIdToken'
            ).mockImplementation(() => mockLoginTicket);

            const result = await service.googleGetTokenInfo(idToken);
            expect(result).toEqual({ email });
            expect(service['googleClient'].verifyIdToken).toHaveBeenCalledWith({
                idToken,
            });
        });
    });
});
