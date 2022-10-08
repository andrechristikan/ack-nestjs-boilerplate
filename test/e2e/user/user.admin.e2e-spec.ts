import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { Types, connection } from 'mongoose';
import {
    E2E_USER_ADMIN_ACTIVE_URL,
    E2E_USER_ADMIN_CREATE_URL,
    E2E_USER_ADMIN_DELETE_URL,
    E2E_USER_ADMIN_GET_URL,
    E2E_USER_ADMIN_INACTIVE_URL,
    E2E_USER_ADMIN_LIST_URL,
    E2E_USER_ADMIN_UPDATE_URL,
} from './user.constant';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { UserDocument } from 'src/modules/user/schemas/user.schema';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { RoleDocument } from 'src/modules/role/schemas/role.schema';
import { plainToInstance } from 'class-transformer';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { IUserDocument } from 'src/modules/user/interfaces/user.interface';

describe('E2E User Admin', () => {
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

    let userData: Record<string, any>;
    let userExist: UserDocument;

    let accessToken: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoutesAdminModule,
                RouterModule.register([
                    {
                        path: '/admin',
                        module: RoutesAdminModule,
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

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        userData = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: password,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            role: `${role._id}`,
        };

        const passwordHash = await authService.createPassword(
            faker.internet.password(20, true, /[A-Za-z0-9]/)
        );

        userExist = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpired: passwordHash.passwordExpired,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            role: `${role._id}`,
        });

        const user = await userService.findOne<IUserDocument>(
            {
                email: 'admin@mail.com',
            },
            {
                populate: true,
            }
        );

        const map = plainToInstance(UserPayloadSerialization, user);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadHashed = await authService.encryptAccessToken(payload);
        accessToken = await authService.createAccessToken(payloadHashed);

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

    it(`GET ${E2E_USER_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_LIST_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                role: 'test_roles',
                accessFor: 'test',
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Role Not Found`, async () => {
        const req = {
            ...userData,
            role: `${new Types.ObjectId()}`,
            password,
        };

        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send(req);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                email: userExist.email,
                mobileNumber: userExist.mobileNumber,
                password,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                email: userExist.email,
                password,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Phone Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                mobileNumber: userExist.mobileNumber,
                password,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send(userData);

        userData = response.body.data;
        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);

        return;
    });

    it(`GET ${E2E_USER_ADMIN_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_USER_ADMIN_GET_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_USER_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_GET_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_USER_ADMIN_UPDATE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                firstName: [],
                lastName: 1231231,
            })
            .expect(422);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_USER_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            })
            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_USER_ADMIN_UPDATE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            })
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_USER_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_INACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_INACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(400);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_USER_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_ACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, already active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_ACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(400);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_ACTIVE_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_USER_ADMIN_DELETE_URL} Delete, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .delete(
                E2E_USER_ADMIN_DELETE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_USER_ADMIN_DELETE_URL} Delete, success`, async () => {
        const response = await request(app.getHttpServer())
            .delete(E2E_USER_ADMIN_DELETE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey)
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(userData._id);
            await userService.deleteOneById(userExist._id);
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
