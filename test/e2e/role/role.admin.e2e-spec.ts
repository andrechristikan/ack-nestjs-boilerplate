import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import {
    E2E_ROLE_ACCESS_FOR_URL,
    E2E_ROLE_ADMIN_ACTIVE_URL,
    E2E_ROLE_ADMIN_CREATE_URL,
    E2E_ROLE_ADMIN_DELETE_URL,
    E2E_ROLE_ADMIN_GET_BY_ID_URL,
    E2E_ROLE_ADMIN_INACTIVE_URL,
    E2E_ROLE_ADMIN_LIST_URL,
    E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL,
    E2E_ROLE_ADMIN_UPDATE_URL,
} from './role.constant';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleCreateDto } from 'src/modules/role/dtos/role.create.dto';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST } from 'test/e2e/user/user.constant';
import { RoleUpdateNameDto } from 'src/modules/role/dtos/role.update-name.dto';
import { RoleUpdatePermissionDto } from 'src/modules/role/dtos/role.update-permission.dto';

describe('E2E Role Admin', () => {
    let app: INestApplication;
    let authService: AuthService;
    let roleService: RoleService;

    let role: RoleEntity;
    let roleUpdate: RoleEntity;

    let accessToken: string;

    let successData: RoleCreateDto;
    let updateData: RoleUpdateNameDto;
    let updateDataPermission: RoleUpdatePermissionDto;
    let existData: RoleCreateDto;

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
        roleService = app.get(RoleService);

        successData = {
            name: 'testRole1',
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        roleUpdate = await roleService.create({
            name: 'testRole2',
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        });

        updateData = {
            name: 'testRole3',
        };

        updateDataPermission = {
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        existData = {
            name: 'testRole',
            accessFor: ENUM_AUTH_ACCESS_FOR.ADMIN,
        };

        role = await roleService.create(existData);

        const payload = await authService.createPayloadAccessToken(
            {
                ...E2E_USER_ACCESS_TOKEN_PAYLOAD_TEST,
                loginDate: new Date(),
            },
            false
        );
        accessToken = await authService.createAccessToken(payload);

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await roleService.deleteMany({
                name: 'testRole',
            });
            await roleService.deleteMany({
                name: 'testRole1',
            });
            await roleService.deleteMany({
                name: 'testRole2',
            });
            await roleService.deleteMany({
                name: 'testRole3',
            });
        } catch (e) {}

        await app.close();
    });

    it(`GET ${E2E_ROLE_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ROLE_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_ROLE_ADMIN_GET_BY_ID_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_ROLE_ADMIN_GET_BY_ID_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`GET ${E2E_ROLE_ADMIN_GET_BY_ID_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ROLE_ADMIN_GET_BY_ID_URL.replace(':_id', role._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send({
                name: 123123,
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send(existData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR
        );
    });

    it(`POST ${E2E_ROLE_ADMIN_CREATE_URL} Create Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_ROLE_ADMIN_CREATE_URL)
            .send(successData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send({
                name: [231231],
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
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
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Exist`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send(existData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_EXIST_ERROR
        );
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_URL} Update Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_ROLE_ADMIN_UPDATE_URL.replace(':_id', roleUpdate._id))
            .send(updateData)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL} Update Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL.replace(
                    ':_id',
                    roleUpdate._id
                )
            )
            .send({
                name: [231231],
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL} Update Not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .send(updateDataPermission)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`PUT ${E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL} Update Success`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_ROLE_ADMIN_UPDATE_PERMISSION_URL.replace(
                    ':_id',
                    roleUpdate._id
                )
            )
            .send(updateDataPermission)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_ROLE_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_INACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_ROLE_ADMIN_INACTIVE_URL} Inactive, already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_INACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_ACTIVE_ERROR
        );
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_ROLE_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_ACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`PATCH ${E2E_ROLE_ADMIN_ACTIVE_URL} Active, already active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_ROLE_ADMIN_ACTIVE_URL.replace(':_id', roleUpdate._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_ACTIVE_ERROR
        );
    });

    it(`DELETE ${E2E_ROLE_ADMIN_DELETE_URL} Delete Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .delete(
                E2E_ROLE_ADMIN_DELETE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );
    });

    it(`DELETE ${E2E_ROLE_ADMIN_DELETE_URL} Delete Success`, async () => {
        const response = await request(app.getHttpServer())
            .delete(E2E_ROLE_ADMIN_DELETE_URL.replace(':_id', role._id))
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`GET ${E2E_ROLE_ACCESS_FOR_URL} Access For Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_ROLE_ACCESS_FOR_URL)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
