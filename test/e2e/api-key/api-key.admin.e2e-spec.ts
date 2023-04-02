import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import {
    E2E_API_KEY_ADMIN_ACTIVE_URL,
    E2E_API_KEY_ADMIN_INACTIVE_URL,
    E2E_API_KEY_ADMIN_UPDATE_DATE_URL,
} from 'test/e2e/api-key/api-key.constant';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { faker } from '@faker-js/faker';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ApiKeyDoc } from 'src/common/api-key/repository/entities/api-key.entity';
import { E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST } from 'test/e2e/user/user.constant';

describe('E2E Api Key Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let apiKeyService: ApiKeyService;
    let helperDateService: HelperDateService;

    let accessToken: string;

    let apiKey: ApiKeyDoc;
    let apiKeyExpired: ApiKeyDoc;
    const apiKeyCreate = {
        name: `${faker.name.firstName()}${faker.random.alphaNumeric(20)}`,
    };

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'false';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoutesAdminModule,
                RouterModule.register([
                    {
                        path: '/admin',
                        module: RoutesAdminModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        authService = app.get(AuthService);
        apiKeyService = app.get(ApiKeyService);
        helperDateService = app.get(HelperDateService);

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);

        const apiKeyCreated1 = await apiKeyService.create(
            E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST._id,
            {
                name: faker.internet.userName(),
                description: faker.random.alphaNumeric(),
            }
        );

        apiKey = await apiKeyService.findOneById(apiKeyCreated1.doc._id);

        const apiKeyCreated2 = await apiKeyService.create(
            E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST._id,
            {
                name: faker.internet.userName(),
                startDate: helperDateService.backwardInDays(7),
                endDate: helperDateService.backwardInDays(1),
            }
        );

        apiKeyExpired = await apiKeyService.findOneById(apiKeyCreated2.doc._id);

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await apiKeyService.deleteMany({
                _id: apiKey._id,
            });

            await apiKeyService.deleteMany({
                name: apiKeyCreate.name,
            });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} Active not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} Expired`, async () => {
        await apiKeyService.inactive(apiKeyExpired);
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_ACTIVE_URL.replace(':_id', apiKeyExpired._id)
            )
            .set('Authorization', `Bearer ${accessToken}`);

        await apiKeyService.active(apiKeyExpired);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} already Active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_ACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Expired`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    apiKeyExpired._id
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_INACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_INACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR
        );
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_ACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_API_KEY_ADMIN_UPDATE_DATE_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_API_KEY_ADMIN_UPDATE_DATE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .send({
                startDate: helperDateService.forwardInDays(1),
                endDate: helperDateService.forwardInDays(7),
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );
    });

    it(`PUT ${E2E_API_KEY_ADMIN_UPDATE_DATE_URL} Expired`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_API_KEY_ADMIN_UPDATE_DATE_URL.replace(
                    ':_id',
                    apiKeyExpired._id
                )
            )
            .send({
                startDate: helperDateService.forwardInDays(1),
                endDate: helperDateService.forwardInDays(7),
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_EXPIRED_ERROR
        );
    });

    it(`PUT ${E2E_API_KEY_ADMIN_UPDATE_DATE_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_API_KEY_ADMIN_UPDATE_DATE_URL.replace(':_id', apiKey._id))
            .send({
                startDate: helperDateService.forwardInDays(1),
                endDate: helperDateService.forwardInDays(7),
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
