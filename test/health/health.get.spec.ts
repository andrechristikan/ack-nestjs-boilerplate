import { HttpStatus, INestApplication } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { connection } from 'mongoose';
import { CoreModule } from 'src/core/core.module';
import { RouterCommonModule } from 'src/router/router.common.module';
import { E2E_HEALTH_URL } from './health.constant';
import request from 'supertest';
import { ENUM_HEALTH_STATUS_CODE_ERROR } from 'src/health/health.contant';

describe('E2E Health', () => {
    let app: INestApplication;

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

        await app.init();
    });

    it(`GET ${E2E_HEALTH_URL} Health Success`, async () => {
        const response = await request(app.getHttpServer()).get(E2E_HEALTH_URL);
        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(
            ENUM_HEALTH_STATUS_CODE_ERROR.HEALTH_UNHEALTHY_ERROR
        );

        return;
    });

    afterAll(async () => {
        connection.close();
        await app.close();
    });
});
