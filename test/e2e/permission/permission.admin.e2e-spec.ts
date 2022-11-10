import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_PERMISSION_ADMIN_ACTIVE_URL,
    E2E_PERMISSION_ADMIN_GET_URL,
    E2E_PERMISSION_ADMIN_INACTIVE_URL,
    E2E_PERMISSION_ADMIN_LIST_URL,
    E2E_PERMISSION_ADMIN_UPDATE_URL,
    E2E_PERMISSION_PAYLOAD_TEST,
} from './permission.constant';
import { connection } from 'mongoose';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from 'src/modules/permission/constants/permission.status-code.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E Permission Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let permissionService: PermissionService;
    let helperDateService: HelperDateService;
    let apiKeyService: ApiKeyService;

    let accessToken: string;
    let permission: PermissionEntity;

    const updateData: PermissionUpdateDto = {
        name: 'update role',
        description: 'UPDATE_ROLE',
    };

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

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
        permissionService = app.get(PermissionService);
        helperDateService = app.get(HelperDateService);
        apiKeyService = app.get(ApiKeyService);

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_PERMISSION_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);

        permission = await permissionService.create({
            name: 'testPermission',
            code: 'TEST_PERMISSION_XXXX',
            description: 'test description',
        });

        timestamp = helperDateService.timestamp();
        const apiEncryption = await apiKeyService.encryptApiKey(
            {
                key: apiKey,
                timestamp,
                hash: 'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54',
            },
            'opbUwdiS1FBsrDUoPgZdx',
            'cuwakimacojulawu'
        );
        xApiKey = `${apiKey}:${apiEncryption}`;

        await app.init();
    });

    it(`GET ${E2E_PERMISSION_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_PERMISSION_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`GET ${E2E_PERMISSION_ADMIN_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_PERMISSION_ADMIN_GET_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_PERMISSION_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_PERMISSION_ADMIN_GET_URL.replace(':_id', permission._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(':_id', permission._id)
            )
            .send({
                name: [1231231],
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(':_id', permission._id)
            )
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} already Active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(':_id', permission._id)
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    permission._id
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    permission._id
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(':_id', permission._id)
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await permissionService.deleteOne({
                _id: permission._id,
            });
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
