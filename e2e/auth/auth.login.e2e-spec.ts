import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';

import { E2E_AUTH_LOGIN_URL } from './auth.constant';
import { UserDocument } from 'src/user/schema/user.schema';
import { RoleDocument } from 'src/role/schema/role.schema';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import {
    ENUM_AUTH_STATUS_CODE_ERROR,
    ENUM_AUTH_STATUS_CODE_SUCCESS,
} from 'src/auth/auth.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { connection } from 'mongoose';
import { RoleService } from 'src/role/service/role.service';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from 'src/auth/service/auth.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';
import { RouterCommonModule } from 'src/router/router.common.module';

describe('E2E Login', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;

    const password = `@!${faker.random
        .alphaNumeric(5)
        .toLowerCase()}${faker.random.alphaNumeric(5).toUpperCase()}`;

    let user: UserDocument;

    let passwordExpiredDate: Date;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterCommonModule,
                RouterModule.register([
                    {
                        path: '/',
                        module: RouterCommonModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        passwordExpiredDate = helperDateService.backwardInDays(5);

        const passwordHash = await authService.createPassword(password);

        user = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpiredDate: passwordHash.passwordExpiredDate,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
            role: `${role._id}`,
        });

        await app.init();
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: [1231],
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: faker.internet.email(),
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Password Not Match`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: user.email,
                password: 'asdaAA@@1231',
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NOT_MATCH_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Inactive`, async () => {
        await userService.inactive(user._id);

        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: user.email,
                password,
                rememberMe: false,
            });

        await userService.active(user._id);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Role Inactive`, async () => {
        await roleService.inactive(`${user.role}`);

        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: user.email,
                password,
                rememberMe: false,
            });

        await roleService.active(`${user.role}`);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: user.email,
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_SUCCESS.AUTH_LOGIN_SUCCESS
        );

        return;
    });

    it(`POST ${E2E_AUTH_LOGIN_URL} Password Expired`, async () => {
        await userService.updatePasswordExpired(user._id, passwordExpiredDate);
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: user.email,
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR
        );

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
