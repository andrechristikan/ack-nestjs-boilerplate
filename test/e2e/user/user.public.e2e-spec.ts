import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesPublicModule } from 'src/router/routes/routes.public.module';
import { E2E_USER_PUBLIC_SIGN_UP_URL } from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

describe('E2E User Public', () => {
    let app: INestApplication;
    let userService: UserService;

    const password = `@!aaAA@123`;
    let userData: Record<string, any>;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    const apiKeyHashed =
        'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54';
    const xApiKey = `${apiKey}:${apiKeyHashed}`;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPTION = 'false';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoutesPublicModule,
                RouterModule.register([
                    {
                        path: '/public',
                        module: RoutesPublicModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        userService = app.get(UserService);

        userData = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: password,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            username: faker.internet.userName(),
        };

        await app.init();
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('x-api-key', xApiKey)
            .send({
                username: faker.name.firstName().toLowerCase(),
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

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('x-api-key', xApiKey)
            .send(userData);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Username Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                mobileNumber: faker.phone.number('62812#########'),
                email: faker.internet.email(),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                username: faker.internet.userName(),
                mobileNumber: faker.phone.number('62812#########'),
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Mobile Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .set('x-api-key', xApiKey)
            .send({
                ...userData,
                username: faker.internet.userName(),
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
    });
});
