import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import {
    E2E_USER_ADMIN_ACTIVE_URL,
    E2E_USER_ADMIN_CREATE_URL,
    E2E_USER_ADMIN_DELETE_URL,
    E2E_USER_ADMIN_EXPORT_URL,
    E2E_USER_ADMIN_GET_URL,
    E2E_USER_ADMIN_IMPORT_URL,
    E2E_USER_ADMIN_INACTIVE_URL,
    E2E_USER_ADMIN_LIST_URL,
    E2E_USER_ADMIN_UPDATE_URL,
    E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
} from './user.constant';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesAdminModule } from 'src/router/routes/routes.admin.module';
import { plainToInstance } from 'class-transformer';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E User Admin', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `@!${faker.name.firstName().toLowerCase()}${faker.name
        .firstName()
        .toUpperCase()}${faker.datatype.number({ min: 1, max: 99 })}`;

    let userData: Record<string, any>;
    let userExist: UserEntity;

    let accessToken: string;
    let permissionToken: string;

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
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);

        const role: RoleEntity = await roleService.findOne({
            name: 'user',
        });

        userData = {
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: password,
            email: faker.internet.email(),
            mobileNumber: faker.phone.number('62812#########'),
            username: faker.internet.userName(),
            role: `${role._id}`,
        };

        const passwordHash = await authService.createPassword(password);

        userExist = await userService.create(
            {
                username: faker.internet.userName(),
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
                password,
                email: faker.internet.email(),
                mobileNumber: faker.phone.number('62812#########'),
                role: `${role._id}`,
            },
            passwordHash
        );

        const user = await userService.findOne<IUserEntity>(
            {
                email: 'superadmin@mail.com',
            },
            {
                join: true,
            }
        );

        const map = plainToInstance(UserPayloadSerialization, user);
        const payload = await authService.createPayloadAccessToken(map, false);
        accessToken = await authService.createAccessToken(payload);
        permissionToken = await authService.createPermissionToken({
            ...E2E_USER_PERMISSION_TOKEN_PAYLOAD_TEST,
            _id: payload._id,
        });

        await app.init();
    });

    it(`GET ${E2E_USER_ADMIN_LIST_URL} List Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_LIST_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                role: 'test_roles',
                accessFor: 'test',
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Role Not Found`, async () => {
        const req = {
            ...userData,
            role: `${DatabaseDefaultUUID()}`,
            password,
        };

        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send(req);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Username Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                ...userData,
                username: userExist.username,
                password,
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_USERNAME_EXISTS_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Email Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                ...userData,
                email: userExist.email,
                password,
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_EMAIL_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Phone Number Exist`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                ...userData,
                mobileNumber: userExist.mobileNumber,
                password,
            });

        expect(response.status).toEqual(HttpStatus.CONFLICT);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_MOBILE_NUMBER_EXIST_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_ADMIN_CREATE_URL} Create, Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send(userData);

        userData = response.body.data;

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);

        return;
    });

    it(`GET ${E2E_USER_ADMIN_GET_URL} Get Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(
                E2E_USER_ADMIN_GET_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_USER_ADMIN_GET_URL} Get Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_ADMIN_GET_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_USER_ADMIN_UPDATE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                firstName: [],
                lastName: 1231231,
            })
            .expect(422);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, not found`, async () => {
        const response = await request(app.getHttpServer())
            .put(
                E2E_USER_ADMIN_UPDATE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            })
            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PUT ${E2E_USER_ADMIN_UPDATE_URL} Update, success`, async () => {
        const response = await request(app.getHttpServer())
            .put(E2E_USER_ADMIN_UPDATE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)
            .send({
                firstName: faker.name.firstName(),
                lastName: faker.name.lastName(),
            })
            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_USER_ADMIN_INACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_INACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_INACTIVE_URL} Inactive, already inactive`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_INACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(400);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_IS_ACTIVE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(
                E2E_USER_ADMIN_ACTIVE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_ACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`PATCH ${E2E_USER_ADMIN_ACTIVE_URL} Active, already active`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_ADMIN_ACTIVE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(400);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_IS_ACTIVE_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_USER_ADMIN_DELETE_URL} Delete, Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .delete(
                E2E_USER_ADMIN_DELETE_URL.replace(
                    ':_id',
                    `${DatabaseDefaultUUID()}`
                )
            )
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(404);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`DELETE ${E2E_USER_ADMIN_DELETE_URL} Delete, success`, async () => {
        const response = await request(app.getHttpServer())
            .delete(E2E_USER_ADMIN_DELETE_URL.replace(':_id', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken)

            .expect(200);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_ADMIN_IMPORT_URL} Import Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_IMPORT_URL)
            .attach('file', './test/e2e/user/files/import.csv')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.CREATED);
        expect(response.body.statusCode).toEqual(HttpStatus.CREATED);

        return;
    });

    it(`POST ${E2E_USER_ADMIN_EXPORT_URL} Export Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_ADMIN_EXPORT_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('x-permission-token', permissionToken);

        expect(response.status).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(userData._id);
            await userService.deleteOneById(userExist._id);
            await userService.deleteOne({ username: 'test111' });
        } catch (err: any) {
            console.error(err);
        }
    });
});
