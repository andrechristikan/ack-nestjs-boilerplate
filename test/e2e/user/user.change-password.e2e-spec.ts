import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { Types, connection } from 'mongoose';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { User } from 'src/modules/user/schemas/user.schema';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { Role } from 'src/modules/role/schemas/role.schema';
import { plainToInstance } from 'class-transformer';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { E2E_USER_CHANGE_PASSWORD_URL } from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { IUser } from 'src/modules/user/interfaces/user.interface';

describe('E2E User Change Password', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let authApiService: AuthApiService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    const password = `aaAA@!123`;
    const newPassword = `bbBB@!456`;

    let user: User;

    let accessToken: string;
    let accessTokenNotFound: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
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
        authApiService = app.get(AuthApiService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);

        const role: Role = await roleService.findOne({
            name: 'user',
        });

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

        const map = plainToInstance(UserPayloadSerialization, userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${new DatabasePrimaryKey()}`,
        };
        const payloadHashed = await authService.encryptAccessToken(payload);
        const payloadHashedNotFound = await authService.encryptAccessToken(
            payloadNotFound
        );

        accessToken = await authService.createAccessToken(payloadHashed);
        accessTokenNotFound = await authService.createAccessToken(
            payloadHashedNotFound
        );
        await app.init();
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: '123123',
                newPassword: '123',
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessTokenNotFound}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Old Password Not Match`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: 'as1231dAA@@!',
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} New Password must different with old password`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword: password,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NEW_MUST_DIFFERENCE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`)
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
