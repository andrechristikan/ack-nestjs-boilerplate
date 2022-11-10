import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_USER_PROFILE_UPLOAD_URL,
    E2E_USER_PROFILE_URL,
} from './user.constant';
import { connection } from 'mongoose';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/common/file/constants/file.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E User', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;
    let apiKeyService: ApiKeyService;

    let user: UserEntity;

    let accessToken: string;
    let accessTokenNotFound: string;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPTION = 'false';

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
        apiKeyService = app.get(ApiKeyService);

        const role: RoleEntity = await roleService.findOne({
            name: 'user',
        });

        const passwordHash = await authService.createPassword(
            faker.internet.password(20, true, /[A-Za-z0-9]/)
        );

        user = await userService.create({
            username: faker.internet.userName(),
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpired: passwordHash.passwordExpired,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            role: `${role._id}`,
        });

        const userPopulate = await userService.findOneById<IUserEntity>(
            user._id,
            {
                join: true,
            }
        );

        const map = await userService.payloadSerialization(userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${DatabaseDefaultUUID()}`,
        };

        accessToken = await authService.createAccessToken(payload);
        accessTokenNotFound = await authService.createAccessToken(
            payloadNotFound
        );

        timestamp = helperDateService.timestamp();
        const apiEncryption = await apiKeyService.encryptApiKey(
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

    it(`GET ${E2E_USER_PROFILE_URL} Profile Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PROFILE_URL)
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

    it(`GET ${E2E_USER_PROFILE_URL} Profile`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PROFILE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_PROFILE_UPLOAD_URL} Profile Upload Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PROFILE_UPLOAD_URL)
            .attach('file', './test/e2e/user/files/test.txt')
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

    it(`POST ${E2E_USER_PROFILE_UPLOAD_URL} Profile Upload Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PROFILE_UPLOAD_URL)
            .attach('file', './test/e2e/user/files/test.txt')
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

    it(`POST ${E2E_USER_PROFILE_UPLOAD_URL} Profile Upload File Too Large`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './test/e2e/user/files/medium.jpg')
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

    it(`POST ${E2E_USER_PROFILE_UPLOAD_URL} Profile Upload Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './test/e2e/user/files/small.jpg')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data')
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
        } catch (e) {}

        connection.close();
        await app.close();
    });
});
