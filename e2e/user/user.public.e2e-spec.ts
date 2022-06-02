import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { IUserDocument } from 'src/user/user.interface';
import {
    E2E_USER_PUBLIC_PROFILE_UPLOAD_URL,
    E2E_USER_PUBLIC_PROFILE_URL,
} from './user.constant';
import { Types, connection } from 'mongoose';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from 'src/auth/service/auth.service';
import { RoleService } from 'src/role/service/role.service';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/utils/file/file.constant';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RoleDocument } from 'src/role/schema/role.schema';
import { UserDocument } from 'src/user/schema/user.schema';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { useContainer } from 'class-validator';
import { AuthApiService } from 'src/auth/service/auth.api.service';

describe('E2E User Public', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    let user: UserDocument;

    let accessToken: string;
    let accessTokenNotFound: string;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

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
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        const passwordHash = await authService.createPassword(
            faker.internet.password(20, true, /[A-Za-z0-9]/)
        );

        user = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpired: passwordHash.passwordExpired,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
            role: `${role._id}`,
        });

        const userPopulate = await userService.findOneById<IUserDocument>(
            user._id,
            {
                populate: {
                    role: true,
                    permission: true,
                },
            }
        );

        const map = await authService.serializationLogin(userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${new Types.ObjectId()}`,
        };

        accessToken = await authService.createAccessToken(payload);
        accessTokenNotFound = await authService.createAccessToken(
            payloadNotFound
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

    it(`GET ${E2E_USER_PUBLIC_PROFILE_URL} Profile Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PUBLIC_PROFILE_URL)
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

    it(`GET ${E2E_USER_PUBLIC_PROFILE_URL} Profile`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PUBLIC_PROFILE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .attach('file', './e2e/user/files/test.txt')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(response.body.statusCode).toEqual(
            ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .attach('file', './e2e/user/files/test.txt')
            .set('Authorization', `Bearer ${accessTokenNotFound}`)
            .set('Content-Type', 'multipart/form-data')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload File Too Large`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './e2e/user/files/medium.jpg')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(response.body.statusCode).toEqual(
            ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './e2e/user/files/small.jpg')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data')
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    }, 5000);

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
