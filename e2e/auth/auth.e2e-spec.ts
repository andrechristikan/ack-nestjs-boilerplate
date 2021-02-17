import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import {
    E2E_AUTH_LOGIN_BASIC_URL,
    E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
    E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET,
    E2E_AUTH_LOGIN_URL
} from 'e2e/auth/auth.e2e-constant';
import { AppModule } from 'src/app/app.module';
import { HashService } from 'src/hash/hash.service';
import {
    E2E_USER_CREATE_URL,
    E2E_USER_DATA,
    E2E_USER_DELETE_URL,
    E2E_USER_FIND_ONE_BY_ID_URL
} from 'e2e/user/user.e2e-constant';

describe('E2E Auth', () => {
    let app: INestApplication;
    let hashService: HashService;
    let basicToken: string;
    let userId: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        hashService = app.get(HashService);
        await app.init();

        basicToken = await hashService.createBasicToken(
            E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
            E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET
        );
    });

    it(`/POST CREATE USER FOR LOGIN`, async () => {
        const createReq = await request(app.getHttpServer())
            .post(E2E_USER_CREATE_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .send(E2E_USER_DATA)
            .expect(201);

        userId = createReq.body.data.id;
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ONE_BY_ID_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200);
    });

    it(`/POST LOGIN`, async () => {
        await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_BASIC_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .expect(201);
    });

    it(`/POST LOGIN BASIC`, async () => {
        await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: E2E_USER_DATA.email,
                password: E2E_USER_DATA.password
            })
            .expect(201);
    });

    it(`/DELETE USER FOR LOGIN`, async () => {
        return request(app.getHttpServer())
            .delete(E2E_USER_DELETE_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200);
    });

    afterAll(async () => {
        await app.close();
    });
});
