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
    E2E_USER_DELETE_URL,
    E2E_USER_FIND_ONE_BY_ID_URL
} from 'e2e/user/user.e2e-constant';
import { IUserCreate } from 'src/user/user.interface';
import * as faker from 'faker';

describe('E2E Auth', () => {
    let app: INestApplication;
    let hashService: HashService;
    let basicToken: string;
    let userId: string;
    const userRaw: IUserCreate = {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.name.firstName().toLowerCase(),
        lastName: faker.name.lastName().toLowerCase(),
        mobileNumber: faker.phone.phoneNumber('62###########'),
        password: faker.internet.password()
    };

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
            .send(userRaw)
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
                email: userRaw.email,
                password: userRaw.password
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
