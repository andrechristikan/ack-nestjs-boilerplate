import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { RoleService } from 'src/role/role.service';
import request from 'supertest';
import faker from '@faker-js/faker';
import { Types, connection } from 'mongoose';
import { RoleDocument } from 'src/role/role.schema';
import { UserService } from 'src/user/user.service';
import { IUserDocument } from 'src/user/user.interface';
import {
    E2E_USER_ADMIN_ACTIVE_URL,
    E2E_USER_ADMIN_CREATE_URL,
    E2E_USER_ADMIN_DELETE_URL,
    E2E_USER_ADMIN_GET_URL,
    E2E_USER_ADMIN_INACTIVE_URL,
    E2E_USER_ADMIN_LIST_URL,
    E2E_USER_ADMIN_UPDATE_URL,
} from './user.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { UserDocument } from 'src/user/user.schema';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/request/request.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { RouterModule } from '@nestjs/core';
import { CoreModule } from 'src/core/core.module';

describe('E2E User Admin', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `@!${faker.random
        .alphaNumeric(5)
        .toLowerCase()}${faker.random.alphaNumeric(5).toUpperCase()}`;

    let userData: Record<string, any>;
    let userExist: UserDocument;

    let accessToken: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterAdminModule,
                RouterModule.register([
                    {
                        path: '/admin',
                        module: RouterAdminModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        userData = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: password,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
            role: `${role._id}`,
        };

        const passwordHash = await authService.createPassword(
            faker.random.alphaNumeric()
        );

        userExist = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpiredDate: passwordHash.passwordExpiredDate,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
            role: `${role._id}`,
        });

        const user = await userService.findOne<IUserDocument>(
            {
                email: 'admin@mail.com',
            },
            {
                populate: {
                    role: true,
                    permission: true,
                },
            }
        );

        const map = await authService.mapLogin(user);
        const payload = await authService.createPayloadAccessToken(map, false);
        accessToken = await authService.createAccessToken(payload);

        await app.init();
    });

    it(`GET ${E2E_USER_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({
                role: '21easdasd1',
                isAdmin: 'falsea',
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
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_USER_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_GET_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_USER_ADMIN_UPDATE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
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
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName('62812#########'),
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
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName('62812#########'),
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
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_INACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
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
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, already active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_ACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
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
