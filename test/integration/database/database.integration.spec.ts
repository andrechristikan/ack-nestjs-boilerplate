import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INTEGRATION_DATABASE_URL } from './database.constant';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';

describe('Database Integration', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule, RoutesModule],
            controllers: [],
        }).compile();

        app = moduleRef.createNestApplication();

        await app.init();
    });

    it(`GET ${INTEGRATION_DATABASE_URL} Success`, async () => {
        const response = await request(app.getHttpServer()).get(
            INTEGRATION_DATABASE_URL
        );
        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });
});
