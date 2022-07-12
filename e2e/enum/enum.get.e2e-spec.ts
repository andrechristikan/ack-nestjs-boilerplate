import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { RouterEnumModule } from 'src/router/router.enum.module';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { useContainer } from 'class-validator';
import { AuthApiService } from 'src/auth/service/auth.api.service';
import {
    E2E_ENUM_MESSAGE_LANGUAGE_URL,
    E2E_ENUM_ROLE_ACCESS_FOR_URL,
} from './enum.constant';

describe('E2E User Service Enum', () => {
    let app: INestApplication;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterEnumModule,
                RouterModule.register([
                    {
                        path: '/enum',
                        module: RouterEnumModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CoreModule), { fallbackOnErrors: true });
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);

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

    it(`GET ${E2E_ENUM_ROLE_ACCESS_FOR_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ENUM_ROLE_ACCESS_FOR_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_ENUM_MESSAGE_LANGUAGE_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ENUM_MESSAGE_LANGUAGE_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
    afterAll(async () => {
        await app.close();
    });
});
