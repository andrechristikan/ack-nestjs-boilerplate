import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { connection } from 'mongoose';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_SETTING_COMMON_GET_BY_NAME_URL,
    E2E_SETTING_COMMON_GET_URL,
    E2E_SETTING_COMMON_LIST_URL,
} from './setting.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingService } from 'src/common/setting/services/setting.service';
import { Setting } from 'src/common/setting/schemas/setting.schema';
import { DatabasePrimaryKey } from 'src/common/database/decorators/database.decorator';

describe('E2E Setting', () => {
    let app: INestApplication;
    let settingService: SettingService;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    let setting: Setting;
    const settingName: string = faker.random.alphaNumeric(10);

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
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
        settingService = app.get(SettingService);
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

        await settingService.create({ name: settingName, value: true });
        setting = await settingService.findOneByName(settingName);

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
                    `${DatabasePrimaryKey()}`
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
        try {
            await settingService.deleteOne({ name: settingName });
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
