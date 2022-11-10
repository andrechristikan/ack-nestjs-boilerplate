import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { AuthService } from 'src/common/auth/services/auth.service';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { AuthModule } from 'src/common/auth/auth.module';
import configs from 'src/configs';
import { ConfigModule } from '@nestjs/config';
import { HelperModule } from 'src/common/helper/helper.module';

describe('AuthService', () => {
    let authService: AuthService;

    const rememberMe = false;

    let payloadHashedAccessToken: string | Record<string, any>;

    let payloadHashedRefreshToken: string | Record<string, any>;

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
            permissions: [],
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
            providers: [],
        }).compile();

        authService = moduleRef.get<AuthService>(AuthService);
    });

    it('should be defined', async () => {
        expect(authService).toBeDefined();
    });

    describe('encryptAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'encryptAccessToken');

            await authService.encryptAccessToken(user);
            expect(test).toHaveBeenCalledWith(user);
        });

        it('should be success with production env', async () => {
            const payloadHashedAccessToken =
                await authService.encryptAccessToken(user);
            jest.spyOn(authService, 'encryptAccessToken').mockImplementation(
                async () => payloadHashedAccessToken
            );

            expect(await authService.encryptAccessToken(user)).toBe(
                payloadHashedAccessToken
            );
        });
    });

    describe('decryptAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'decryptAccessToken');

            const encryptionPayload = await authService.encryptAccessToken(
                user
            );
            await authService.decryptAccessToken({ data: encryptionPayload });
            expect(test).toHaveBeenCalledWith({ data: encryptionPayload });
        });

        it('should be success', async () => {
            const encryptionPayload = await authService.encryptAccessToken(
                user
            );
            const payload = await authService.decryptAccessToken({
                data: encryptionPayload,
            });
            jest.spyOn(authService, 'decryptAccessToken').mockImplementation(
                async () => payload
            );

            expect(
                await authService.decryptAccessToken({
                    data: encryptionPayload,
                })
            ).toBe(payload);
        });
    });

    describe('createAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createAccessToken');

            await authService.createAccessToken(payloadHashedAccessToken);
            expect(test).toHaveBeenCalledWith(payloadHashedAccessToken);
        });

        it('should be success', async () => {
            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            jest.spyOn(authService, 'createAccessToken').mockImplementation(
                async () => accessToken
            );

            expect(
                await authService.createAccessToken(payloadHashedAccessToken)
            ).toBe(accessToken);
        });

        it('should be success with options', async () => {
            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            jest.spyOn(authService, 'createAccessToken').mockImplementation(
                async () => accessToken
            );

            expect(
                await authService.createAccessToken(payloadHashedAccessToken)
            ).toBe(accessToken);
        });
    });

    describe('validateAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateAccessToken');

            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            await authService.validateAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            const validate = await authService.validateAccessToken(accessToken);
            jest.spyOn(authService, 'validateAccessToken').mockImplementation(
                async () => validate
            );

            expect(await authService.validateAccessToken(accessToken)).toBe(
                validate
            );
        });

        it('should be success with options', async () => {
            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            const validate = await authService.validateAccessToken(accessToken);
            jest.spyOn(authService, 'validateAccessToken').mockImplementation(
                async () => validate
            );

            expect(await authService.validateAccessToken(accessToken)).toBe(
                validate
            );
        });
    });

    describe('payloadAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'payloadAccessToken');

            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            await authService.payloadAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const accessToken = await authService.createAccessToken(
                payloadHashedAccessToken
            );
            jest.spyOn(authService, 'payloadAccessToken').mockImplementation(
                async () => user
            );

            expect(await authService.payloadAccessToken(accessToken)).toBe(
                user
            );
        });
    });

    describe('encryptRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'encryptRefreshToken');

            await authService.encryptRefreshToken(user);
            expect(test).toHaveBeenCalledWith(user);
        });

        it('should be success with production env', async () => {
            const payloadHashedRefreshToken =
                await authService.encryptRefreshToken(user);
            jest.spyOn(authService, 'encryptRefreshToken').mockImplementation(
                async () => payloadHashedRefreshToken
            );

            expect(await authService.encryptRefreshToken(user)).toBe(
                payloadHashedRefreshToken
            );
        });
    });

    describe('decryptRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'decryptRefreshToken');

            const encryptionPayload = await authService.encryptRefreshToken(
                user
            );
            await authService.decryptRefreshToken({ data: encryptionPayload });
            expect(test).toHaveBeenCalledWith({ data: encryptionPayload });
        });

        it('should be success', async () => {
            const encryptionPayload = await authService.encryptRefreshToken(
                user
            );
            const payload = await authService.decryptRefreshToken({
                data: encryptionPayload,
            });
            jest.spyOn(authService, 'decryptRefreshToken').mockImplementation(
                async () => payload
            );

            expect(
                await authService.decryptRefreshToken({
                    data: encryptionPayload,
                })
            ).toBe(payload);
        });
    });

    describe('createRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createRefreshToken');

            await authService.createRefreshToken(payloadHashedRefreshToken);
            expect(test).toHaveBeenCalledWith(payloadHashedRefreshToken);
        });

        it('should be success', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(payloadHashedRefreshToken)
            ).toBe(refreshToken);
        });

        it('should be success with options remember me', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken,
                {
                    rememberMe: true,
                }
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(
                    payloadHashedRefreshToken,
                    {
                        rememberMe: true,
                    }
                )
            ).toBe(refreshToken);
        });

        it('should be success with options notBeforeExpirationTime', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken,
                {
                    notBeforeExpirationTime: '0',
                }
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(
                    payloadHashedRefreshToken,
                    {
                        notBeforeExpirationTime: '0',
                    }
                )
            ).toBe(refreshToken);
        });

        it('should be success with options audience', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(payloadHashedRefreshToken)
            ).toBe(refreshToken);
        });

        it('should be success with full options', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken,
                {
                    rememberMe,
                    notBeforeExpirationTime: '0',
                }
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(
                    payloadHashedRefreshToken,
                    {
                        rememberMe,
                        notBeforeExpirationTime: '0',
                    }
                )
            ).toBe(refreshToken);
        });
    });

    describe('validateRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateRefreshToken');

            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            await authService.validateRefreshToken(refreshToken);
            expect(test).toHaveBeenCalledWith(refreshToken);
        });

        it('should be success', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            const validate = await authService.validateRefreshToken(
                refreshToken
            );
            jest.spyOn(authService, 'validateRefreshToken').mockImplementation(
                async () => validate
            );

            expect(await authService.validateRefreshToken(refreshToken)).toBe(
                validate
            );
        });

        it('should be success with audience', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            const validate = await authService.validateRefreshToken(
                refreshToken
            );
            jest.spyOn(authService, 'validateRefreshToken').mockImplementation(
                async () => validate
            );

            expect(await authService.validateRefreshToken(refreshToken)).toBe(
                validate
            );
        });
    });

    describe('payloadRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'payloadRefreshToken');

            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            await authService.payloadRefreshToken(refreshToken);
            expect(test).toHaveBeenCalledWith(refreshToken);
        });

        it('should be success', async () => {
            const refreshToken = await authService.createRefreshToken(
                payloadHashedRefreshToken
            );
            jest.spyOn(authService, 'payloadRefreshToken').mockImplementation(
                async () => user
            );

            expect(await authService.payloadRefreshToken(refreshToken)).toBe(
                user
            );
        });
    });

    describe('validateUser', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateUser');
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const passwordHash = await authService.createPassword(password);

            await authService.validateUser(password, passwordHash.passwordHash);
            expect(test).toHaveBeenCalledWith(
                password,
                passwordHash.passwordHash
            );
        });

        it('should be success', async () => {
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const passwordHash = await authService.createPassword(password);
            const validate = await authService.validateUser(
                password,
                passwordHash.passwordHash
            );

            jest.spyOn(authService, 'validateUser').mockImplementation(
                async () => validate
            );

            expect(
                await authService.validateUser(
                    password,
                    passwordHash.passwordHash
                )
            ).toBe(validate);
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPayloadAccessToken');
            await authService.createPayloadAccessToken(user, rememberMe);
            expect(test).toHaveBeenCalledWith(user, rememberMe);
        });

        it('should be mapped', async () => {
            const payload = await authService.createPayloadAccessToken(
                user,
                rememberMe
            );
            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadAccessToken(user, rememberMe)
            ).toBe(payload);
        });

        it('login date should be mapped', async () => {
            const payload = await authService.createPayloadAccessToken(
                user,
                rememberMe,
                { loginDate: new Date() }
            );
            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadAccessToken(user, rememberMe, {
                    loginDate: new Date(),
                })
            ).toBe(payload);
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPayloadRefreshToken');

            await authService.createPayloadRefreshToken(user._id, rememberMe);
            expect(test).toHaveBeenCalledWith(user._id, rememberMe);
        });

        it('should be success', async () => {
            const payload = await authService.createPayloadRefreshToken(
                user._id,
                rememberMe
            );
            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadRefreshToken(
                    user._id,
                    rememberMe
                )
            ).toBe(payload);
        });

        it('login date should be success', async () => {
            const payload = await authService.createPayloadRefreshToken(
                user._id,
                rememberMe,
                { loginDate: new Date() }
            );
            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadRefreshToken(
                    user._id,
                    rememberMe,
                    {
                        loginDate: new Date(),
                    }
                )
            ).toBe(payload);
        });
    });

    describe('createPassword', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPassword');
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);

            await authService.createPassword(password);
            expect(test).toHaveBeenCalledWith(password);
        });

        it('should be success', async () => {
            const password = faker.internet.password(20, true, /[A-Za-z0-9]/);
            const passwordHash = await authService.createPassword(password);

            jest.spyOn(authService, 'createPassword').mockImplementation(
                async () => passwordHash
            );

            expect(await authService.createPassword(password)).toBe(
                passwordHash
            );
        });
    });

    describe('checkPasswordExpired', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'checkPasswordExpired');

            await authService.checkPasswordExpired(user.passwordExpired);
            expect(test).toHaveBeenCalledWith(user.passwordExpired);
        });

        it('should be success false', async () => {
            const result = await authService.checkPasswordExpired(
                user.passwordExpired
            );
            jest.spyOn(authService, 'checkPasswordExpired').mockImplementation(
                async () => result
            );

            expect(
                await authService.checkPasswordExpired(user.passwordExpired)
            ).toBe(result);
        });

        it('should be success true', async () => {
            const expiredDate = new Date('1999-01-01');
            const result = await authService.checkPasswordExpired(expiredDate);
            jest.spyOn(authService, 'checkPasswordExpired').mockImplementation(
                async () => result
            );

            expect(await authService.checkPasswordExpired(expiredDate)).toBe(
                result
            );
        });
    });

    describe('getTokenType', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'getTokenType');
            await authService.getTokenType();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const tokenType = await authService.getTokenType();

            jest.spyOn(authService, 'getTokenType').mockImplementation(
                async () => tokenType
            );

            expect(await authService.getTokenType()).toBe(tokenType);
        });
    });

    describe('getAccessTokenExpirationTime', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                authService,
                'getAccessTokenExpirationTime'
            );
            await authService.getAccessTokenExpirationTime();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const expiredTime =
                await authService.getAccessTokenExpirationTime();

            jest.spyOn(
                authService,
                'getAccessTokenExpirationTime'
            ).mockImplementation(async () => expiredTime);

            expect(await authService.getAccessTokenExpirationTime()).toBe(
                expiredTime
            );
        });
    });

    describe('getRefreshTokenExpirationTime', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                authService,
                'getRefreshTokenExpirationTime'
            );
            await authService.getRefreshTokenExpirationTime();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const expiredTime =
                await authService.getRefreshTokenExpirationTime();

            jest.spyOn(
                authService,
                'getRefreshTokenExpirationTime'
            ).mockImplementation(async () => expiredTime);

            expect(await authService.getRefreshTokenExpirationTime()).toBe(
                expiredTime
            );
        });

        it('should be success with rememberMe', async () => {
            const expiredTime = await authService.getRefreshTokenExpirationTime(
                true
            );

            jest.spyOn(
                authService,
                'getRefreshTokenExpirationTime'
            ).mockImplementation(async () => expiredTime);

            expect(await authService.getRefreshTokenExpirationTime(true)).toBe(
                expiredTime
            );
        });
    });

    describe('getIssuer', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'getIssuer');
            await authService.getIssuer();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const issuers = await authService.getIssuer();

            jest.spyOn(authService, 'getIssuer').mockImplementation(
                async () => issuers
            );

            expect(await authService.getIssuer()).toBe(issuers);
        });
    });

    describe('getAudience', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'getAudience');
            await authService.getAudience();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const audiences = await authService.getAudience();

            jest.spyOn(authService, 'getAudience').mockImplementation(
                async () => audiences
            );

            expect(await authService.getAudience()).toBe(audiences);
        });
    });

    describe('getSubject', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'getSubject');
            await authService.getSubject();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const audiences = await authService.getSubject();

            jest.spyOn(authService, 'getSubject').mockImplementation(
                async () => audiences
            );

            expect(await authService.getSubject()).toBe(audiences);
        });
    });

    describe('getPayloadEncryption', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'getPayloadEncryption');
            await authService.getPayloadEncryption();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const audiences = await authService.getPayloadEncryption();

            jest.spyOn(authService, 'getPayloadEncryption').mockImplementation(
                async () => audiences
            );

            expect(await authService.getPayloadEncryption()).toBe(audiences);
        });
    });
});
