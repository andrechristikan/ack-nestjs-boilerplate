import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import {
    E2E_SETTING_ADMIN_PAYLOAD_TEST,
    E2E_SETTING_ADMIN_UPDATE_URL,
} from './setting.constant';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E Setting Admin', () => {
    let app: INestApplication;
    let settingService: SettingService;
    let authService: AuthService;

    let setting: SettingEntity;
    const settingName: string = faker.random.alphaNumeric(10);

    let accessToken: string;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    const apiKeyHashed =
        'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54';
    const xApiKey = `${apiKey}:${apiKeyHashed}`;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPTION = 'false';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoutesAdminModule,
                RouterModule.register([
                    {
                        path: '/admin',
                        module: RoutesAdminModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        authService = app.get(AuthService);
        settingService = app.get(SettingService);

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_SETTING_ADMIN_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);

        await settingService.create({
            name: settingName,
            value: 'true',
            type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
        });
        setting = await settingService.findOneByName(settingName);

        await app.init();
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_SETTING_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 'true', type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({
                value: { test: 'aaa', type: ENUM_SETTING_DATA_TYPE.STRING },
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 'test', type: ENUM_SETTING_DATA_TYPE.STRING });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Number Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 123, type: ENUM_SETTING_DATA_TYPE.NUMBER });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Convert If Possible Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: 'false', type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Boolean Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey)
            .send({ value: false, type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

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
    });
});
