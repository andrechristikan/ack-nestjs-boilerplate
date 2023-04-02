import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesPublicModule } from 'src/router/routes/routes.public.module';
import {
    E2E_USER_PUBLIC_DELETE_URL,
    E2E_USER_PUBLIC_SIGN_UP_URL,
} from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { AuthModule } from 'src/common/auth/auth.module';
import { AuthService } from 'src/common/auth/services/auth.service';

describe('E2E User Public', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;

    const password = `@!aaAA@123`;
    let userData: Record<string, any>;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'false';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoutesPublicModule,
                AuthModule,
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
        authService = app.get(AuthService);

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

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await userService.deleteMany({
                email: userData.email,
                mobileNumber: userData.mobileNumber,
            });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
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
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send(userData);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Username Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                ...userData,
                mobileNumber: faker.phone.number('62812#########'),
                email: faker.internet.email(),
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR
        );
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                ...userData,
                username: faker.internet.userName(),
                mobileNumber: faker.phone.number('62812#########'),
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );
    });

    it(`POST ${E2E_USER_PUBLIC_SIGN_UP_URL} Sign Up Mobile Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_SIGN_UP_URL)
            .set('Content-Type', 'application/json')
            .send({
                ...userData,
                username: faker.internet.userName(),
                email: faker.internet.email(),
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR
        );
    });

    it(`DELETE ${E2E_USER_PUBLIC_DELETE_URL} Success`, async () => {
        const user = await userService.findOneByUsername<IUserDoc>(
            userData.username,
            {
                join: true,
            }
        );
        const map = await userService.payloadSerialization(user);
        const payload = await authService.createPayloadAccessToken(map);
        const accessToken = await authService.createAccessToken(payload);

        const response = await request(app.getHttpServer())
            .delete(E2E_USER_PUBLIC_DELETE_URL)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
