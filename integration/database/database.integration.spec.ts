import { HttpStatus, INestApplication } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { HealthCommonController } from 'src/health/controller/health.common.controller';
import { HealthModule } from 'src/health/health.module';
import request from 'supertest';
import { E2E_DATABASE_INTEGRATION_URL } from './database.constant';

describe('Database Integration', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule, HealthModule, TerminusModule],
            controllers: [HealthCommonController],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    it(`GET ${E2E_DATABASE_INTEGRATION_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_DATABASE_INTEGRATION_URL)
            .set('x-timestamp', `${Date.now()}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        await app.close();
    });
});
