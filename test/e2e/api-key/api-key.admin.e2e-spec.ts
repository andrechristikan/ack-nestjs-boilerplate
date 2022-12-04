import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import {
    E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
    E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
} from 'test/e2e/user/user.constant';
import { ENUM_API_KEY_STATUS_CODE_ERROR } from 'src/common/api-key/constants/api-key.status-code.constant';
import {
    E2E_API_KEY_ADMIN_ACTIVE_URL,
    E2E_API_KEY_ADMIN_CREATE_URL,
    E2E_API_KEY_ADMIN_GET_URL,
    E2E_API_KEY_ADMIN_INACTIVE_URL,
    E2E_API_KEY_ADMIN_LIST_URL,
    E2E_API_KEY_ADMIN_UPDATE_RESET_URL,
} from 'test/e2e/api-key/api-key.constant';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { faker } from '@faker-js/faker';

describe('E2E Api Key Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let apiKeyService: ApiKeyService;

    let accessToken: string;
    let permissionToken: string;

    let apiKey: ApiKeyEntity;
    const apiKeyCreate = {
        name: `${faker.name.firstName()}${faker.random.alphaNumeric(20)}`,
    };

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPTION = 'false';

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

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);
        permissionToken = await authService.createPermissionToken({
            ...E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
            _id: payload._id,
        });

        apiKey = await apiKeyService.create({
            name: faker.name.firstName(),
        });

        await app.init();
    });

    it(`GET ${E2E_API_KEY_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_API_KEY_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`GET ${E2E_API_KEY_ADMIN_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_API_KEY_ADMIN_GET_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_API_KEY_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_API_KEY_ADMIN_GET_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_API_KEY_ADMIN_CREATE_URL} Create Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_API_KEY_ADMIN_CREATE_URL)
            .send({
                name: [1231231],
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_API_KEY_ADMIN_CREATE_URL} Create Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_API_KEY_ADMIN_CREATE_URL)
            .send(apiKeyCreate)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);

        return;
    });

    it(`PUT ${E2E_API_KEY_ADMIN_UPDATE_RESET_URL} Reset Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_API_KEY_ADMIN_UPDATE_RESET_URL.replace(
                    ':_id',
                    DatabaseDefaultUUID()
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_API_KEY_ADMIN_UPDATE_RESET_URL} Reset Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_API_KEY_ADMIN_UPDATE_RESET_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} Active not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_ACTIVE_URL} already Active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_ACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_API_KEY_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_INACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_API_KEY_ADMIN_INACTIVE_URL} Inactive already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_API_KEY_ADMIN_INACTIVE_URL.replace(':_id', apiKey._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_API_KEY_STATUS_CODE_ERROR.API_KEY_IS_ACTIVE_ERROR
        );

        return;
    });

    afterAll(async () => {
        try {
            await apiKeyService.deleteOne({
                _id: apiKey._id,
            });

            await apiKeyService.deleteOne({
                name: apiKeyCreate.name,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
