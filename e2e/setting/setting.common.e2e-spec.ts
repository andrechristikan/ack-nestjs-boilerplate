import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import { CoreModule } from 'src/core/core.module';
import { SettingService } from 'src/setting/service/setting.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { connection, Types } from 'mongoose';
import request from 'supertest';
import faker from '@faker-js/faker';
import { SettingDocument } from 'src/setting/schema/setting.schema';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/setting/setting.constant';
import {
    E2E_SETTING_COMMON_GET_BY_NAME_URL,
    E2E_SETTING_COMMON_GET_URL,
    E2E_SETTING_COMMON_LIST_URL,
} from './setting.constant';
import { RouterCommonModule } from 'src/router/router.common.module';

describe('E2E Setting Common', () => {
    let app: INestApplication;
    let settingService: SettingService;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    let setting: SettingDocument;

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
        useContainer(app.select(CoreModule), { fallbackOnErrors: true });
        settingService = app.get(SettingService);
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

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

    it(`GET ${E2E_SETTING_COMMON_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_SETTING_COMMON_LIST_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`GET ${E2E_SETTING_COMMON_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_SETTING_COMMON_GET_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_SETTING_COMMON_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_SETTING_COMMON_GET_URL.replace(':_id', `${setting._id}`))
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`GET ${E2E_SETTING_COMMON_GET_BY_NAME_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_SETTING_COMMON_GET_BY_NAME_URL.replace(
                    ':settingName',
                    faker.name.firstName()
                )
            )
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_SETTING_COMMON_GET_BY_NAME_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_SETTING_COMMON_GET_BY_NAME_URL.replace(
                    ':settingName',
                    setting.name
                )
            )
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        connection.close();
        await app.close();
    });
});
