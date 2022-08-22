import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { useContainer } from 'class-validator';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { AuthApiService } from 'src/common/auth/services/auth.api.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from '../../../src/router/routes/routes.module';
import { E2E_AUTH_INFO_URL, E2E_AUTH_PAYLOAD_TEST } from './auth.constant';
import { AuthService } from 'src/common/auth/services/auth.service';

describe('E2E Auth', () => {
    let app: INestApplication;
    let helperDateService: HelperDateService;
    let authApiService: AuthApiService;
    let authService: AuthService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    let accessToken: string;

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
        helperDateService = app.get(HelperDateService);
        authApiService = app.get(AuthApiService);
        authService = app.get(AuthService);

        const payload = await authService.createPayloadAccessToken(
            E2E_AUTH_PAYLOAD_TEST,
            false
        );
        accessToken = await authService.createAccessToken(payload);

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

    it(`GET ${E2E_AUTH_INFO_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_AUTH_INFO_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    afterAll(async () => {
        await app.close();
    });
});
