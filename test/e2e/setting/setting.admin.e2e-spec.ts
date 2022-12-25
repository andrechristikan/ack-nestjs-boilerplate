import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import { E2E_SETTING_ADMIN_UPDATE_URL } from './setting.constant';
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
import {
    E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
    E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
} from 'test/e2e/user/user.constant';

describe('E2E Setting Admin', () => {
    let app: INestApplication;
    let settingService: SettingService;
    let authService: AuthService;

    let setting: SettingEntity;
    const settingName: string = faker.random.alphaNumeric(10);

    let accessToken: string;
    let permissionToken: string;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'false';

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
                ...E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);
        permissionToken = await authService.createPermissionToken({
            ...E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
            _id: payload._id,
        });

        await settingService.create({
            name: settingName,
            value: 'true',
            type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
        });
        setting = await settingService.findOneByName(settingName);

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await settingService.deleteOne({ name: settingName });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
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
            .set('x-permission-token', permissionToken)
            .send({ value: 'true', type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                value: { test: 'aaa', type: ENUM_SETTING_DATA_TYPE.STRING },
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Value Not Allowed`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                value: 'test',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_VALUE_NOT_ALLOWED_ERROR
        );
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({ value: 'test', type: ENUM_SETTING_DATA_TYPE.STRING });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Number Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({ value: 123, type: ENUM_SETTING_DATA_TYPE.NUMBER });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update String Convert If Possible Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({ value: 'false', type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_SETTING_ADMIN_UPDATE_URL} Update Boolean Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_SETTING_ADMIN_UPDATE_URL.replace(':_id', `${setting._id}`))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({ value: false, type: ENUM_SETTING_DATA_TYPE.BOOLEAN });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
