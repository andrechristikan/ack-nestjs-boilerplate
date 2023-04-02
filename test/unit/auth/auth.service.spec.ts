import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import configs from 'src/configs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HelperModule } from 'src/common/helper/helper.module';
import { IAuthPassword } from 'src/common/auth/interfaces/auth.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AuthModule } from 'src/common/auth/auth.module';

describe('AuthService', () => {
    let authService: AuthService;
    let configService: ConfigService;
    let helperDateService: HelperDateService;

    let encryptedAccessToken: string;
    let accessToken: string;

    let encryptedRefreshToken: string;
    let refreshToken: string;

    let prefixAuthorization: string;
    let accessTokenExpirationTime: number;

    let refreshTokenExpirationTime: number;

    let issuer: string;
    let audience: string;
    let subject: string;

    let payloadEncryption: boolean;

    // cSpell:ignore ZfqgaDMPpWQ3lJEGQ8Ueu stnk
    const user: Record<string, any> = {
        _id: '623cb7fd37a861a10bac2c91',
        isActive: true,
        salt: '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu',
        passwordExpired: new Date('2023-03-24T18:27:09.500Z'),
        password:
            '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu1vJ3C6G3stnkS/5e61bK/4f1.Fuw2Eq',
        role: {
            _id: '623cb7f7965a74bf7a0e9e53',
            accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
            isActive: true,
            name: 'admin',
        },
        email: 'admin@mail.com',
        mobileNumber: '08111111111',
        lastName: 'test',
        firstName: 'admin@mail.com',
    };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                AuthModule,
            ],
        }).compile();

        authService = moduleRef.get<AuthService>(AuthService);
        configService = moduleRef.get<ConfigService>(ConfigService);
        helperDateService = moduleRef.get<HelperDateService>(HelperDateService);
        user.passwordExpired = helperDateService.forwardInDays(30);

        accessToken = await authService.createAccessToken(user);
        encryptedAccessToken = await authService.encryptAccessToken(user);

        refreshToken = await authService.createRefreshToken(user, {
            notBeforeExpirationTime: 0,
        });
        encryptedRefreshToken = await authService.encryptRefreshToken(user);

        prefixAuthorization = configService.get<string>(
            'auth.prefixAuthorization'
        );
        accessTokenExpirationTime = configService.get<number>(
            'auth.accessToken.expirationTime'
        );

        refreshTokenExpirationTime = configService.get<number>(
            'auth.refreshToken.expirationTime'
        );

        issuer = configService.get<string>('auth.issuer');
        audience = configService.get<string>('auth.audience');
        subject = configService.get<string>('auth.subject');

        payloadEncryption = configService.get<boolean>(
            'auth.payloadEncryption'
        );
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', async () => {
        expect(authService).toBeDefined();
    });

    describe('encryptAccessToken', () => {
        it('should be return a hashed string', async () => {
            const result: string = await authService.encryptAccessToken(user);

            jest.spyOn(authService, 'encryptAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('decryptAccessToken', () => {
        it('should be return payload data', async () => {
            const result: Record<string, any> =
                await authService.decryptAccessToken({
                    data: encryptedAccessToken,
                });

            jest.spyOn(authService, 'decryptAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
        });
    });

    describe('createAccessToken', () => {
        it('should be create access token in string, from object', async () => {
            const result: string = await authService.createAccessToken(user);

            jest.spyOn(authService, 'createAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be create access token in string, from string', async () => {
            const result: string = await authService.createAccessToken('');

            jest.spyOn(authService, 'createAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('validateAccessToken', () => {
        it('should be verified', async () => {
            const result: boolean = await authService.validateAccessToken(
                accessToken
            );

            jest.spyOn(authService, 'validateAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = await authService.validateAccessToken(
                faker.random.alphaNumeric(20)
            );

            jest.spyOn(authService, 'validateAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('payloadAccessToken', () => {
        it('should given a payload of token', async () => {
            const result: Record<string, any> =
                await authService.payloadAccessToken(accessToken);

            jest.spyOn(authService, 'payloadAccessToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.data._id).toBe(user._id);
        });
    });

    describe('encryptRefreshToken', () => {
        it('should be return a hashed string', async () => {
            const result: string = await authService.encryptRefreshToken(user);

            jest.spyOn(authService, 'encryptRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('decryptRefreshToken', () => {
        it('should be return payload data', async () => {
            const result: Record<string, any> =
                await authService.decryptRefreshToken({
                    data: encryptedRefreshToken,
                });

            jest.spyOn(authService, 'decryptRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
        });
    });

    describe('createRefreshToken', () => {
        it('should be create refresh token in string, from object', async () => {
            const result: string = await authService.createRefreshToken(user);

            jest.spyOn(authService, 'createRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });

        it('should be create refresh token in string, from string', async () => {
            const result: string = await authService.createRefreshToken('');

            jest.spyOn(authService, 'createRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('validateRefreshToken', () => {
        it('should be verified', async () => {
            const result: boolean = await authService.validateRefreshToken(
                refreshToken
            );

            jest.spyOn(authService, 'validateRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = await authService.validateRefreshToken(
                faker.random.alphaNumeric(20)
            );

            jest.spyOn(authService, 'validateRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('payloadRefreshToken', () => {
        it('should given a payload of token', async () => {
            const result: Record<string, any> =
                await authService.payloadRefreshToken(refreshToken);

            jest.spyOn(authService, 'payloadRefreshToken').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.data._id).toBe(user._id);
        });
    });

    describe('validateUser', () => {
        it('should be a valid user', async () => {
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const passwordHash = await authService.createPassword(password);
            const result: boolean = await authService.validateUser(
                password,
                passwordHash.passwordHash
            );

            jest.spyOn(authService, 'validateUser').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be not valid user', async () => {
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const passwordHash = await authService.createPassword(password);
            const result: boolean = await authService.validateUser(
                'aasdasd12312',
                passwordHash.passwordHash
            );

            jest.spyOn(authService, 'validateUser').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should be mapped', async () => {
            const result: Record<string, any> =
                await authService.createPayloadAccessToken(user);

            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
        });

        it('payload with login date options', async () => {
            const result: Record<string, any> =
                await authService.createPayloadAccessToken(user, {
                    loginDate: new Date(),
                });

            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
            expect(result.loginDate).toBeDefined();
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('should be mapped', async () => {
            const result: Record<string, any> =
                await authService.createPayloadRefreshToken(user._id);

            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
        });

        it('payload with login date options', async () => {
            const result: Record<string, any> =
                await authService.createPayloadRefreshToken(user._id, {
                    loginDate: new Date(),
                });

            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result._id).toBe(user._id);
            expect(result.loginDate).toBeDefined();
        });
    });

    describe('createPassword', () => {
        it('should be success', async () => {
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const result: IAuthPassword = await authService.createPassword(
                password
            );

            jest.spyOn(authService, 'createPassword').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('checkPasswordExpired', () => {
        it('should be not expired', async () => {
            const result: boolean = await authService.checkPasswordExpired(
                user.passwordExpired
            );
            jest.spyOn(authService, 'checkPasswordExpired').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });

        it('should be expired', async () => {
            const expiredDate = new Date('1999-01-01');
            const result: boolean = await authService.checkPasswordExpired(
                expiredDate
            );

            jest.spyOn(authService, 'checkPasswordExpired').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('getTokenType', () => {
        it('should be success', async () => {
            const result: string = await authService.getTokenType();

            jest.spyOn(authService, 'getTokenType').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(prefixAuthorization);
        });
    });

    describe('getAccessTokenExpirationTime', () => {
        it('should be give number in days for access token expiration', async () => {
            const result: number =
                await authService.getAccessTokenExpirationTime();

            jest.spyOn(
                authService,
                'getAccessTokenExpirationTime'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result).toBe(accessTokenExpirationTime);
        });
    });

    describe('getRefreshTokenExpirationTime', () => {
        it('should be give number in days for refresh token expiration', async () => {
            const result: number =
                await authService.getRefreshTokenExpirationTime();

            jest.spyOn(
                authService,
                'getRefreshTokenExpirationTime'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result).toBe(refreshTokenExpirationTime);
        });
    });

    describe('getIssuer', () => {
        it('should be success', async () => {
            const result: string = await authService.getIssuer();

            jest.spyOn(authService, 'getIssuer').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(issuer);
        });
    });

    describe('getAudience', () => {
        it('should be success', async () => {
            const result: string = await authService.getAudience();

            jest.spyOn(authService, 'getAudience').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(audience);
        });
    });

    describe('getSubject', () => {
        it('should be success', async () => {
            const result: string = await authService.getSubject();

            jest.spyOn(authService, 'getSubject').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(subject);
        });
    });

    describe('getPayloadEncryption', () => {
        it('should be success', async () => {
            const result: boolean = await authService.getPayloadEncryption();

            jest.spyOn(authService, 'getPayloadEncryption').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
            expect(result).toBe(payloadEncryption);
        });
    });
});
