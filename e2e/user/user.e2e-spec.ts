import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import {
    E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
    E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET,
    E2E_AUTH_LOGIN_URL
} from 'e2e/auth/auth.e2e-constant';
import {
    E2E_USER_FIND_ALL_URL,
    E2E_USER_FIND_ONE_BY_ID_URL,
    E2E_USER_PROFILE_URL,
    E2E_USER_CREATE_URL,
    E2E_USER_UPDATE_URL,
    E2E_USER_DATA,
    E2E_USER_UPDATE_DATA,
    E2E_USER_DELETE_URL
} from 'e2e/user/user.e2e-constant';
import { AppModule } from 'src/app/app.module';
import { HashService } from 'src/hash/hash.service';
import { ResponseService } from 'src/response/response.service';
import { AppSuccessStatusCode } from 'src/status-code/status-code.success.constant';
import { IUserSafe } from 'src/user/user.interface';

describe('E2E User', () => {
    let app: INestApplication;
    let basicToken: string;
    let hashService: HashService;
    let responseService: ResponseService;
    let userId: string;
    let user: IUserSafe;

    beforeAll(async () => {
        const modRef: TestingModule = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        hashService = app.get(HashService);
        responseService = app.get(ResponseService);

        await app.init();
        basicToken = await hashService.createBasicToken(
            E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
            E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET
        );
    });

    it(`/POST CREATE`, async () => {
        const createReq = await request(app.getHttpServer())
            .post(E2E_USER_CREATE_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .send(E2E_USER_DATA)
            .expect(201);

        userId = createReq.body.data.id;
        user = createReq.body.data;
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ONE_BY_ID_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, user)
            );
    });

    it(`/GET FIND ALL`, async () => {
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ALL_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, [user])
            );
    });

    it(`/GET FIND BY ID}`, async () => {
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ONE_BY_ID_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, user)
            );
    });

    it(`/GET PROFILE`, async () => {
        const loginReq = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: E2E_USER_DATA.email,
                password: E2E_USER_DATA.password
            })
            .expect(201);
        const jwtToken: string = loginReq.body.data.accessToken;

        return request(app.getHttpServer())
            .get(E2E_USER_PROFILE_URL)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, user)
            );
    });

    it(`/PUT UPDATE BY ID`, async () => {
        return request(app.getHttpServer())
            .put(E2E_USER_UPDATE_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .send(E2E_USER_UPDATE_DATA)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_UPDATE, {
                    ...user,
                    ...E2E_USER_UPDATE_DATA
                })
            );
    });

    it(`/DELETE DELETE BY ID`, async () => {
        return request(app.getHttpServer())
            .delete(E2E_USER_DELETE_URL.replace(':userId', userId))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(responseService.success(AppSuccessStatusCode.USER_DELETE));
    });

    afterAll(async () => {
        await app.close();
    });
});
