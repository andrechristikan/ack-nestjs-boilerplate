import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HashService } from 'hash/hash.service';
import { ResponseService } from 'response/response.service';
import { AppSuccessStatusCode } from 'status-code/status-code.success.constant';
import * as request from 'supertest';
import { AppModule } from 'app/app.module';
import {
    E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
    E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET,
    E2E_AUTH_LOGIN_EMAIL,
    E2E_AUTH_LOGIN_PASSWORD,
    E2E_AUTH_LOGIN_URL
} from '../auth/auth.e2e-constant';
import {
    E2E_USER_FIND_ALL_URL,
    E2E_USER_FIND_ONE_BY_ID_URL,
    E2E_USER_PROFILE_URL
} from './user.e2e-constant';

describe('E2e User', () => {
    const user: Record<string, any> = {
        id: '5f8002b6f48bd016b2d061a9',
        email: 'andrechristikan@gmail.com',
        firstName: 'andre christi',
        lastName: 'kan',
        mobileNumber: '628121996882'
    };

    let app: INestApplication;
    let jwtToken: string;
    let basicToken: string;
    let hashService: HashService;
    let responseService: ResponseService;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        hashService = app.get(HashService);
        responseService = app.get(ResponseService);

        await app.init();

        // Get token
        const login = await request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: E2E_AUTH_LOGIN_EMAIL,
                password: E2E_AUTH_LOGIN_PASSWORD
            })
            .expect(201);

        jwtToken = login.body.data.accessToken;
        basicToken = await hashService.createBasicToken(
            E2E_AUTH_LOGIN_BASIC_CLIENT_ID,
            E2E_AUTH_LOGIN_BASIC_CLIENT_SECRET
        );
    });

    it(`/GET ${E2E_USER_FIND_ALL_URL}`, async () => {
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ALL_URL)
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, [user])
            );
    });

    it(`/GET ${E2E_USER_FIND_ONE_BY_ID_URL.replace(
        ':userId',
        user.id
    )}`, async () => {
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ONE_BY_ID_URL.replace(':userId', user.id))
            .set('Authorization', `Basic ${basicToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, user)
            );
    });

    it(`/GET ${E2E_USER_PROFILE_URL}`, async () => {
        return request(app.getHttpServer())
            .get(E2E_USER_PROFILE_URL)
            .set('Authorization', `Bearer ${jwtToken}`)
            .expect(200)
            .expect(
                responseService.success(AppSuccessStatusCode.USER_GET, user)
            );
    });

    afterAll(async () => {
        await app.close();
    });
});
