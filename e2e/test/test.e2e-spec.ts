import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app/app.module';
import { ConfigService } from '@nestjs/config';
import { E2E_TEST_HELLO_BASIC_TOKEN_URL, E2E_TEST_HELLO_URL } from './test.e2e-constant';
import {
    AUTH_BASIC_CLIENT_ID,
    AUTH_BASIC_CLIENT_SECRET
} from 'src/auth/auth.constant';
import { HashService } from 'src/hash/hash.service';

describe('E2E Test', () => {
    let app: INestApplication;
    let configService: ConfigService;
    let hashService: HashService;
    let basicToken: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        configService = app.get(ConfigService);
        hashService = app.get(HashService);

        const clientId: string =
            (await configService.get('')) || AUTH_BASIC_CLIENT_ID;
        const clientSecret: string =
            (await configService.get('')) || AUTH_BASIC_CLIENT_SECRET;

        basicToken = await hashService.encryptBase64(
            `${clientId}:${clientSecret}`
        );

        await app.init();
    });

    it(`GET ${E2E_TEST_HELLO_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(E2E_TEST_HELLO_URL)
            .expect(200)
            .end(done);
    });

    it(`GET ${E2E_TEST_HELLO_BASIC_TOKEN_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(E2E_TEST_HELLO_BASIC_TOKEN_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .end(done);
    });

    afterAll(async () => {
        await app.close();
    });
});
