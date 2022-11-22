import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_ROLE_ADMIN_ACTIVE_URL,
    E2E_ROLE_ADMIN_CREATE_URL,
    E2E_ROLE_ADMIN_DELETE_URL,
    E2E_ROLE_ADMIN_GET_BY_ID_URL,
    E2E_ROLE_ADMIN_INACTIVE_URL,
    E2E_ROLE_ADMIN_LIST_URL,
    E2E_ROLE_ADMIN_UPDATE_URL,
    E2E_ROLE_PAYLOAD_TEST,
} from './role.constant';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { PermissionService } from 'src/modules/permission/services/permission.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_AUTH_PERMISSIONS } from 'src/common/auth/constants/auth.enum.permission.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleBulkService } from 'src/modules/role/services/role.bulk.service';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { PermissionEntity } from 'src/modules/permission/repository/entities/permission.entity';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E Role Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let roleService: RoleService;
    let permissionService: PermissionService;
    let roleBulkService: RoleBulkService;

    let role: RoleEntity;
    let roleUpdate: RoleEntity;

    let accessToken: string;

    let successData: RoleCreateDto;
    let updateData: RoleCreateDto;
    let existData: RoleCreateDto;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    const apiKeyHashed =
        'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54';
    const xApiKey = `${apiKey}:${apiKeyHashed}`;

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
        roleService = app.get(RoleService);
        roleBulkService = app.get(RoleBulkService);
        permissionService = app.get(PermissionService);

        const permissions: PermissionEntity[] = await permissionService.findAll(
            {
                code: {
                    $in: [
                        ENUM_AUTH_PERMISSIONS.ROLE_READ,
                        ENUM_AUTH_PERMISSIONS.ROLE_CREATE,
                        ENUM_AUTH_PERMISSIONS.ROLE_UPDATE,
                        ENUM_AUTH_PERMISSIONS.ROLE_DELETE,
                        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
                        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
                        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
                        ENUM_AUTH_PERMISSIONS.PERMISSION_READ,
                    ],
                },
            }
        );

        successData = {
            name: 'testRole1',
            permissions: permissions.map((val) => `${val._id}`),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        roleUpdate = await roleService.create({
            name: 'testRole2',
            permissions: permissions.map((val) => `${val._id}`),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        });

        updateData = {
            name: 'testRole3',
            permissions: permissions.map((val) => `${val._id}`),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        existData = {
            name: 'testRole',
            permissions: permissions.map((val) => `${val._id}`),
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        role = await roleService.create(existData);

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_ROLE_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);

        await app.init();
    });

    it(`GET ${E2E_ROLE_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ROLE_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`GET ${E2E_ROLE_ADMIN_GET_BY_ID_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_ROLE_ADMIN_GET_BY_ID_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_ROLE_ADMIN_GET_BY_ID_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ROLE_ADMIN_GET_BY_ID_URL.replace(':_id', role._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send({
                name: 123123,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send(existData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send(successData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);

        return;
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send({
                name: [231231],
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_ROLE_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Exist`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send(existData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR
        );

        return;
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_ROLE_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_INACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_INACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_ROLE_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_ACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, already active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_ACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_ACTIVE_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_ROLE_ADMIN_DELETE_URL} Delete Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .delete(
                E2E_ROLE_ADMIN_DELETE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_ROLE_ADMIN_DELETE_URL} Delete Success`, async () => {
        const response = await request(app.getHttpServer())
            .delete(E2E_ROLE_ADMIN_DELETE_URL.replace(':_id', role._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await roleBulkService.deleteMany({
                name: 'testRole',
            });
            await roleBulkService.deleteMany({
                name: 'testRole1',
            });
            await roleBulkService.deleteMany({
                name: 'testRole2',
            });
            await roleBulkService.deleteMany({
                name: 'testRole3',
            });
        } catch (e) {}
    });
});
