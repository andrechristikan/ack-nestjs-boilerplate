import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HashService } from 'hash/hash.service';
import * as request from 'supertest';
import { AppModule } from '../../src/app/app.module';
import {
    E2E_AUTH_LOGIN_URL,
    E2E_AUTH_LOGIN_EMAIL,
    E2E_AUTH_LOGIN_PASSWORD,
    E2E_AUTH_LOGIN_BASIC_URL,
    E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
    E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET
} from './auth.e2e-constant';

describe('E2e Auth', () => {
    let app: INestApplication;
    let hashService: HashService;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        hashService = app.get(HashService);
        await app.init();
    });

    it(`/POST ${E2E_AUTH_LOGIN_URL}`, async () => {
        await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: E2E_AUTH_LOGIN_EMAIL,
                password: E2E_AUTH_LOGIN_PASSWORD
            })
            .expect(201);
    });

    it(`/POST ${E2E_AUTH_LOGIN_BASIC_URL}`, async () => {
        const basicToken: string = await hashService.createBasicToken(
            E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
            E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET
        );
        await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_BASIC_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .expect(201);
    });

    afterAll(async () => {
        await app.close();
    });
});
