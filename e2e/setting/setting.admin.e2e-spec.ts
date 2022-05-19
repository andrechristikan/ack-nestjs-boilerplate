import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { AuthService } from 'src/auth/service/auth.service';
import { CoreModule } from 'src/core/core.module';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { SettingService } from 'src/setting/service/setting.service';
import { UserService } from 'src/user/service/user.service';
import { IUserDocument } from 'src/user/user.interface';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { connection, Types } from 'mongoose';
import { E2E_SETTING_ADMIN_UPDATE_URL } from './setting.constant';
import request from 'supertest';
import faker from '@faker-js/faker';
import { SettingDocument } from 'src/setting/schema/setting.schema';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/setting/setting.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';

describe('E2E Setting Admin', () => {
    let app: INestApplication;
    let settingService: SettingService;
    let userService: UserService;
    let authService: AuthService;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    let setting: SettingDocument;

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
        useContainer(app.select(CoreModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        authService = app.get(AuthService);
        settingService = app.get(SettingService);
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

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

        const map = await authService.serializationLogin(user);
        const payload = await authService.createPayloadAccessToken(map, false);
        accessToken = await authService.createAccessToken(payload);

        setting = await settingService.findOneByName('maintenance');

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

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_SETTING_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: true });

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: { test: 'aaa' } });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 'falasdasse' });

        await settingService.updateOneById(setting._id, { value: false });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Number Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 123 });

        await settingService.updateOneById(setting._id, { value: false });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Convert If Possible Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 'false' });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Boolean Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: false });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        connection.close();
        await app.close();
    });
});
