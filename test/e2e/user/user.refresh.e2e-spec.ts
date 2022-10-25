import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { connection } from 'mongoose';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { User } from 'src/modules/user/schemas/user.schema';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { plainToInstance } from 'class-transformer';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { E2E_USER_REFRESH_URL } from './user.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { IUser } from 'src/modules/user/interfaces/user.interface';
import { RoleService } from 'src/modules/role/services/role.service';
import { Role } from 'src/modules/role/schemas/role.schema';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { DatabaseKey } from 'src/common/database/decorators/database.decorator';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';

describe('E2E User Refresh', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    const password = `@!${faker.name.firstName().toLowerCase()}${faker.name
        .firstName()
        .toUpperCase()}${faker.datatype.number({ min: 1, max: 99 })}`;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    let user: User;
    let passwordExpired: Date;
    let passwordExpiredForward: Date;

    let refreshToken: string;
    let refreshTokenNotFound: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoleModule,
                PermissionModule,
                RoutesModule,
                RouterModule.register([
                    {
                        path: '/',
                        module: RoutesModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

        const role: Role = await roleService.findOne({
            name: 'user',
        });

        passwordExpired = helperDateService.backwardInDays(5);
        passwordExpiredForward = helperDateService.forwardInDays(5);

        const passwordHash = await authService.createPassword(password);

        user = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpired: passwordHash.passwordExpired,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            role: `${role._id}`,
        });

        const userPopulate = await userService.findOneById<IUser>(user._id, {
            populate: true,
        });

        const map = plainToInstance(UserPayloadSerialization, userPopulate);
        const payload = await authService.createPayloadRefreshToken(
            map._id,
            false
        );
        const payloadNotFound = {
            ...payload,
            _id: `${DatabaseKey()}`,
        };

        const payloadHashed = await authService.encryptRefreshToken(payload);
        const payloadHashedNotFound = await authService.encryptRefreshToken(
            payloadNotFound
        );

        refreshToken = await authService.createRefreshToken(payloadHashed, {
            rememberMe: false,
            notBeforeExpirationTime: '0',
        });
        refreshTokenNotFound = await authService.createRefreshToken(
            payloadHashedNotFound,
            {
                rememberMe: false,
                notBeforeExpirationTime: '0',
            }
        );

        timestamp = helperDateService.timestamp();
        const apiEncryption = await authApiService.encryptApiKey(
            {
                key: apiKey,
                timestamp,
                hash: 'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54',
            },
            'opbUwdiS1FBsrDUoPgZdx',
            'cuwakimacojulawu'
        );
        xApiKey = `${apiKey}:${apiEncryption}`;

        await app.init();
    });

    it(`POST ${E2E_USER_REFRESH_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshTokenNotFound}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Inactive`, async () => {
        await userService.inactive(user._id);
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        await userService.active(user._id);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Role Inactive`, async () => {
        await roleService.inactive(`${user.role}`);
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        await roleService.active(`${user.role}`);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Password Expired`, async () => {
        await userService.updatePasswordExpired(user._id, passwordExpired);
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        await userService.updatePasswordExpired(
            user._id,
            passwordExpiredForward
        );
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
