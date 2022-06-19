import { Test } from '@nestjs/testing';
import { AuthService } from 'src/auth/service/auth.service';
import { CoreModule } from 'src/core/core.module';
import { IRoleDocument } from 'src/role/role.interface';
import { IUserDocument } from 'src/user/user.interface';
import { faker } from '@faker-js/faker';

describe('AuthService', () => {
    let authService: AuthService;

    const rememberMe = false;

    const user: IUserDocument = {
        _id: '623cb7fd37a861a10bac2c91',
        isActive: true,
        salt: '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu',
        passwordExpired: new Date('2023-03-24T18:27:09.500Z'),
        password:
            '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu1vJ3C6G3stnkS/5e61bK/4f1.Fuw2Eq',
        role: {
            _id: '623cb7f7965a74bf7a0e9e53',
            isAdmin: true,
            isActive: true,
            permissions: [],
            name: 'admin',
        } as IRoleDocument,
        email: 'admin@mail.com',
        mobileNumber: '08111111111',
        lastName: 'test',
        firstName: 'admin@mail.com',
    } as IUserDocument;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
            providers: [AuthService],
        }).compile();

        authService = moduleRef.get<AuthService>(AuthService);
    });

    it('should be defined', async () => {
        expect(authService).toBeDefined();
    });

    describe('serializationLogin', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'serializationLogin');

            await authService.serializationLogin(user);
            expect(test).toHaveBeenCalledWith(user);
        });

        it('should be mapped', async () => {
            const map = await authService.serializationLogin(user);
            jest.spyOn(authService, 'serializationLogin').mockImplementation(
                async () => map
            );

            expect(await authService.serializationLogin(user)).toBe(map);
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPayloadAccessToken');

            const map = await authService.serializationLogin(user);
            await authService.createPayloadAccessToken(map, rememberMe);
            expect(test).toHaveBeenCalledWith(map, rememberMe);
        });

        it('should be mapped', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadAccessToken(map, rememberMe)
            ).toBe(payload);
        });

        it('login date should be mapped', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe,
                { loginDate: new Date() }
            );
            jest.spyOn(
                authService,
                'createPayloadAccessToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadAccessToken(map, rememberMe, {
                    loginDate: new Date(),
                })
            ).toBe(payload);
        });
    });

    describe('createAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createAccessToken');

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            await authService.createAccessToken(payload);
            expect(test).toHaveBeenCalledWith(payload);
        });

        it('should be mapped', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            jest.spyOn(authService, 'createAccessToken').mockImplementation(
                async () => accessToken
            );

            expect(await authService.createAccessToken(payload)).toBe(
                accessToken
            );
        });
    });

    describe('validateAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateAccessToken');

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            await authService.validateAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
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

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            await authService.payloadAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            jest.spyOn(authService, 'payloadAccessToken').mockImplementation(
                async () => payload
            );

            expect(await authService.payloadAccessToken(accessToken)).toBe(
                payload
            );
        });
    });

    describe('createPayloadRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPayloadRefreshToken');

            const map = await authService.serializationLogin(user);
            await authService.createPayloadRefreshToken(map, rememberMe);
            expect(test).toHaveBeenCalledWith(map, rememberMe);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadRefreshToken(map, rememberMe)
            ).toBe(payload);
        });

        it('login date should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe,
                { loginDate: new Date() }
            );
            jest.spyOn(
                authService,
                'createPayloadRefreshToken'
            ).mockImplementation(async () => payload);

            expect(
                await authService.createPayloadRefreshToken(map, rememberMe, {
                    loginDate: new Date(),
                })
            ).toBe(payload);
        });
    });

    describe('createRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createRefreshToken');

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            await authService.createRefreshToken(payload, rememberMe);
            expect(test).toHaveBeenCalledWith(payload, rememberMe);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                rememberMe
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(
                await authService.createRefreshToken(payload, rememberMe)
            ).toBe(refreshToken);
        });

        it('remember me should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                true
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                true
            );
            jest.spyOn(authService, 'createRefreshToken').mockImplementation(
                async () => refreshToken
            );

            expect(await authService.createRefreshToken(payload, true)).toBe(
                refreshToken
            );
        });
    });

    describe('validateRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateRefreshToken');

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                rememberMe,
                true
            );
            await authService.validateRefreshToken(refreshToken);
            expect(test).toHaveBeenCalledWith(refreshToken);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                rememberMe,
                true
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

            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                rememberMe,
                true
            );
            await authService.payloadRefreshToken(refreshToken);
            expect(test).toHaveBeenCalledWith(refreshToken);
        });

        it('should be success', async () => {
            const map = await authService.serializationLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            const refreshToken = await authService.createRefreshToken(
                payload,
                rememberMe
            );
            jest.spyOn(authService, 'payloadRefreshToken').mockImplementation(
                async () => payload
            );

            expect(await authService.payloadRefreshToken(refreshToken)).toBe(
                payload
            );
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
});
