import faker from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import { AuthService } from 'src/auth/service/auth.service';
import { CoreModule } from 'src/core/core.module';
import { PermissionModule } from 'src/permission/permission.module';
import { RoleModule } from 'src/role/role.module';
import { UserService } from 'src/user/service/user.service';
import { IUserDocument } from 'src/user/user.interface';
import { UserModule } from 'src/user/user.module';

describe('AuthService', () => {
    let authService: AuthService;
    let userService: UserService;

    const rememberMe = false;
    const email = 'admin@mail.com';

    let user: IUserDocument;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule, UserModule, RoleModule, PermissionModule],
            providers: [AuthService],
        }).compile();

        authService = moduleRef.get<AuthService>(AuthService);
        userService = moduleRef.get<UserService>(UserService);

        user = await userService.findOne<IUserDocument>(
            {
                email,
            },
            { populate: { permission: true, role: true } }
        );
    });

    it('should be defined', () => {
        expect(authService).toBeDefined();
    });

    describe('mapLogin', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'mapLogin');

            await authService.mapLogin(user);
            expect(test).toHaveBeenCalledWith(user);
        });

        it('should be mapped', async () => {
            const map = await authService.mapLogin(user);
            jest.spyOn(authService, 'mapLogin').mockImplementation(
                async () => map
            );

            expect(await authService.mapLogin(user)).toBe(map);
        });
    });

    describe('createPayloadAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPayloadAccessToken');

            const map = await authService.mapLogin(user);
            await authService.createPayloadAccessToken(map, rememberMe);
            expect(test).toHaveBeenCalledWith(map, rememberMe);
        });

        it('should be mapped', async () => {
            const map = await authService.mapLogin(user);
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
    });

    describe('createAccessToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createAccessToken');

            const map = await authService.mapLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            await authService.createAccessToken(payload);
            expect(test).toHaveBeenCalledWith(payload);
        });

        it('should be mapped', async () => {
            const map = await authService.mapLogin(user);
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

            const map = await authService.mapLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            await authService.validateAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const map = await authService.mapLogin(user);
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

            const map = await authService.mapLogin(user);
            const payload = await authService.createPayloadAccessToken(
                map,
                rememberMe
            );
            const accessToken = await authService.createAccessToken(payload);
            await authService.payloadAccessToken(accessToken);
            expect(test).toHaveBeenCalledWith(accessToken);
        });

        it('should be success', async () => {
            const map = await authService.mapLogin(user);
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

            const map = await authService.mapLogin(user);
            await authService.createPayloadRefreshToken(map, rememberMe);
            expect(test).toHaveBeenCalledWith(map, rememberMe);
        });

        it('should be success', async () => {
            const map = await authService.mapLogin(user);
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
    });

    describe('createRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createRefreshToken');

            const map = await authService.mapLogin(user);
            const payload = await authService.createPayloadRefreshToken(
                map,
                rememberMe
            );
            await authService.createRefreshToken(payload, rememberMe);
            expect(test).toHaveBeenCalledWith(payload, rememberMe);
        });

        it('should be success', async () => {
            const map = await authService.mapLogin(user);
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
    });

    describe('validateRefreshToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateRefreshToken');

            const map = await authService.mapLogin(user);
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
            const map = await authService.mapLogin(user);
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

            const map = await authService.mapLogin(user);
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
            const map = await authService.mapLogin(user);
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

    describe('createBasicToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createBasicToken');
            const clientId = faker.random.alphaNumeric();
            const clientSecret = faker.random.alphaNumeric();

            await authService.createBasicToken(clientId, clientSecret);
            expect(test).toHaveBeenCalledWith(clientId, clientSecret);
        });

        it('should be success', async () => {
            const clientId = faker.random.alphaNumeric();
            const clientSecret = faker.random.alphaNumeric();
            const basicToken = await authService.createBasicToken(
                clientId,
                clientSecret
            );

            jest.spyOn(authService, 'createBasicToken').mockImplementation(
                async () => basicToken
            );

            expect(
                await authService.createBasicToken(clientId, clientSecret)
            ).toBe(basicToken);
        });
    });

    describe('validateBasicToken', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'validateBasicToken');
            const clientId = faker.random.alphaNumeric();
            const clientSecret = faker.random.alphaNumeric();
            const basicToken = await authService.createBasicToken(
                clientId,
                clientSecret
            );

            await authService.validateBasicToken(basicToken, basicToken);
            expect(test).toHaveBeenCalledWith(basicToken, basicToken);
        });

        it('should be success', async () => {
            const clientId = faker.random.alphaNumeric();
            const clientSecret = faker.random.alphaNumeric();
            const basicToken = await authService.createBasicToken(
                clientId,
                clientSecret
            );
            const validate = await authService.validateBasicToken(
                basicToken,
                basicToken
            );

            jest.spyOn(authService, 'validateBasicToken').mockImplementation(
                async () => validate
            );

            expect(
                await authService.validateBasicToken(basicToken, basicToken)
            ).toBe(validate);
        });
    });

    describe('createPassword', () => {
        it('should be called', async () => {
            const test = jest.spyOn(authService, 'createPassword');
            const password = faker.random.alphaNumeric();

            await authService.createPassword(password);
            expect(test).toHaveBeenCalledWith(password);
        });

        it('should be success', async () => {
            const password = faker.random.alphaNumeric();
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
            const password = faker.random.alphaNumeric();
            const passwordHash = await authService.createPassword(password);

            await authService.validateUser(password, passwordHash.passwordHash);
            expect(test).toHaveBeenCalledWith(
                password,
                passwordHash.passwordHash
            );
        });

        it('should be success', async () => {
            const password = faker.random.alphaNumeric();
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
});
