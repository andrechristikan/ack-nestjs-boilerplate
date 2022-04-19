import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';
import { E2E_AUTH_PUBLIC_SIGN_UP_URL } from './auth.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { connection } from 'mongoose';
import { UserService } from 'src/user/service/user.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';
import { RouterPublicModule } from 'src/router/router.public.module';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { useContainer } from 'class-validator';

describe('E2E Public', () => {
    let app: INestApplication;
    let userService: UserService;
    let helperDateService: HelperDateService;

    const password = `@!aaAA@123`;

    let userData: Record<string, any>;

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
        useContainer(app.select(CoreModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        helperDateService = app.get(HelperDateService);

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
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                email: faker.name.firstName().toLowerCase(),
                firstName: faker.name.firstName().toLowerCase(),
                lastName: faker.name.lastName().toLowerCase(),
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send(userData);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send(userData);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EXISTS_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                ...userData,
                mobileNumber: faker.phone.phoneNumber('62812#########'),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_PUBLIC_SIGN_UP_URL} Sign Up Mobile Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`)
            .send({
                ...userData,
                email: faker.internet.email(),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR
        );

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOne({
                email: userData.email,
                mobileNumber: userData.mobileNumber,
            });
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
