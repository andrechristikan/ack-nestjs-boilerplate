import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { useContainer } from 'class-validator';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_SETTING_COMMON_GET_BY_NAME_URL,
    E2E_SETTING_COMMON_GET_URL,
    E2E_SETTING_COMMON_LIST_URL,
} from './setting.constant';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { ENUM_SETTING_STATUS_CODE_ERROR } from 'src/common/setting/constants/setting.status-code.constant';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingEntity } from 'src/common/setting/repository/entities/setting.entity';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E Setting', () => {
    let app: INestApplication;
    let settingService: SettingService;

    let setting: SettingEntity;
    const settingName: string = faker.random.alphaNumeric(10);

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'false';

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
            await settingService.deleteMany({ name: settingName });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`GET ${E2E_SETTING_COMMON_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer()).get(
            E2E_SETTING_COMMON_LIST_URL
        );

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_SETTING_COMMON_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer()).get(
            E2E_SETTING_COMMON_GET_URL.replace(
                ':_id',
                `${DatabaseDefaultUUID()}`
            )
        );

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );
    });

    it(`GET ${E2E_SETTING_COMMON_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer()).get(
            E2E_SETTING_COMMON_GET_URL.replace(':_id', `${setting._id}`)
        );

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_SETTING_COMMON_GET_BY_NAME_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer()).get(
            E2E_SETTING_COMMON_GET_BY_NAME_URL.replace(
                ':settingName',
                faker.name.firstName()
            )
        );

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_SETTING_STATUS_CODE_ERROR.SETTING_NOT_FOUND_ERROR
        );
    });

    it(`GET ${E2E_SETTING_COMMON_GET_BY_NAME_URL} Success`, async () => {
        const response = await request(app.getHttpServer()).get(
            E2E_SETTING_COMMON_GET_BY_NAME_URL.replace(
                ':settingName',
                setting.name
            )
        );

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
