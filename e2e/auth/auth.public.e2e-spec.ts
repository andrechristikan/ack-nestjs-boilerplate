import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';
import { UserService } from 'src/user/user.service';
import { E2E_AUTH_PUBLIC_SIGN_UP_URL } from './auth.constant.e2e';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/request/request.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RouterModule } from '@nestjs/core';

describe('E2E Public', () => {
    let app: INestApplication;
    let userService: UserService;

    const password = `@!${faker.random
        .alphaNumeric(5)
        .toLowerCase()}${faker.random.alphaNumeric(5).toUpperCase()}`;

    let userData: Record<string, any>;
    let userId: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterPublicModule,
                RouterModule.register([
                    {
                        path: '/public',
                        module: RouterPublicModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        userService = app.get(UserService);

        userData = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: password,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
        };

        await app.init();
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: faker.name.firstName().toLowerCase(),
                firstName: faker.name.firstName().toLowerCase(),
                lastName: faker.name.lastName().toLowerCase(),
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send(userData);

        userId = response.body.data._id;
        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send(userData);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR
        );
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                ...userData,
                mobileNumber: faker.phone.phoneNumber('62812#########'),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Mobile Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                ...userData,
                email: faker.internet.email(),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR
        );
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(userId);
        } catch (e) {
            console.error(e);
        }
        await app.close();
    });
});
