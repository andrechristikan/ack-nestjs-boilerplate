import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from 'src/auth/auth.service';
import { PermissionService } from 'src/permission/permission.service';
import {
    E2E_PERMISSION_ADMIN_ACTIVE_URL,
    E2E_PERMISSION_ADMIN_GET_URL,
    E2E_PERMISSION_ADMIN_INACTIVE_URL,
    E2E_PERMISSION_ADMIN_LIST_URL,
    E2E_PERMISSION_ADMIN_UPDATE_URL,
    E2E_PERMISSION_PAYLOAD_TEST,
} from './permission.constant.e2e';
import { Types } from 'mongoose';
import { PermissionDocument } from 'src/permission/permission.schema';
import { ENUM_PERMISSION_STATUS_CODE_ERROR } from 'src/permission/permission.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/request/request.constant';
import { PermissionUpdateValidation } from 'src/permission/validation/permission.update.validation';
import { CoreModule } from 'src/core/core.module';
import { RouterAdminModule } from 'src/router/router.admin.module';
import { RouterModule } from '@nestjs/core';

describe('E2E Permission Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let permissionService: PermissionService;

    let accessToken: string;
    let permission: PermissionDocument;

    const updateData: PermissionUpdateValidation = {
        name: 'update role',
        description: 'UPDATEROLE',
    };

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterAdminModule,
                RouterModule.register([
                    {
                        path: '/admin',
                        module: RouterAdminModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        authService = app.get(AuthService);
        permissionService = app.get(PermissionService);

        accessToken = await authService.createAccessToken({
            ...E2E_PERMISSION_PAYLOAD_TEST,
            loginDate: new Date(),
            rememberMe: false,
            loginExpired: await authService.loginExpired(false),
        });

        permission = await permissionService.create({
            isActive: true,
            name: 'testPermission',
            code: 'TEST_PERMISSION_XXXX',
            description: 'test description',
        });

        await app.init();
    });

    it(`GET ${E2E_PERMISSION_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_PERMISSION_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_PERMISSION_ADMIN_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_PERMISSION_ADMIN_GET_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );
    });

    it(`GET ${E2E_PERMISSION_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_PERMISSION_ADMIN_GET_URL.replace(':_id', permission._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(':_id', permission._id)
            )
            .send({
                name: [1231231],
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`PUT ${E2E_PERMISSION_ADMIN_UPDATE_URL} Update Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_PERMISSION_ADMIN_UPDATE_URL.replace(':_id', permission._id)
            )
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active already Active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(':_id', permission._id)
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_ACTIVE_ERROR
        );
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive not found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${new Types.ObjectId()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    permission._id
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_INACTIVE_URL} Inactive already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    permission._id
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_PERMISSION_STATUS_CODE_ERROR.PERMISSION_ACTIVE_ERROR
        );
    });

    it(`PATCH ${E2E_PERMISSION_ADMIN_ACTIVE_URL} Active Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_PERMISSION_ADMIN_ACTIVE_URL.replace(':_id', permission._id)
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    afterAll(async () => {
        try {
            await permission.deleteOne({
                _id: new Types.ObjectId(permission._id),
            });
        } catch (e) {
            console.error(e);
        }
        await app.close();
    });
});
