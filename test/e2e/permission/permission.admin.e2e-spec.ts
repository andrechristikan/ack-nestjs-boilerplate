import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
    E2E_PERMISSION_ADMIN_ACTIVE_URL,
    E2E_PERMISSION_ADMIN_GET_URL,
    E2E_PERMISSION_ADMIN_INACTIVE_URL,
    E2E_PERMISSION_ADMIN_LIST_URL,
    E2E_PERMISSION_ADMIN_UPDATE_URL,
} from './permission.constant';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { PermissionUpdateDto } from 'src/modules/permission/dtos/permission.update.dto';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from 'src/modules/permission/constants/permission.status-code.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';
import {
    E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
    E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
} from 'test/e2e/user/user.constant';

describe('E2E Permission Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let permissionService: PermissionService;

    let accessToken: string;
    let permissionToken: string;
    let permission: PermissionEntity;

    const updateData: PermissionUpdateDto = {
        description: 'UPDATE_ROLE',
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
        permissionService = app.get(PermissionService);

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

        permission = await permissionService.create({
            code: 'TEST_PERMISSION_XXXX',
            description: 'test description',
            group: ENUM_PERMISSION_GROUP.PERMISSION,
        });

        await app.init();
    });

    it(`GET ${E2E_PERMISSION_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_PERMISSION_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_IS_ACTIVE_ERROR
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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

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
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_IS_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(':_id', permission._id)
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

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
    });
});
