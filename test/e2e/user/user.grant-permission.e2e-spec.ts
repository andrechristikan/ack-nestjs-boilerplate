import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { E2E_USER_GRANT_PERMISSION } from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import { RoleDoc } from 'src/modules/role/repository/entities/role.entity';
import { IUserDoc } from 'src/modules/user/interfaces/user.interface';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { ENUM_PERMISSION_GROUP } from 'src/modules/permission/constants/permission.enum.constant';

describe('E2E User Grant Password', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `aaAA@!123`;

    let user: UserDoc;

    let accessToken: string;
    let accessTokenNotFound: string;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'false';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoleModule,
                PermissionModule,
                RoutesModule,
                RouterModule.register([
                    {
                        path: '/',
                        module: RoutesModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);

        const role: RoleDoc = await roleService.findOneByName('user');

        const passwordHash = await authService.createPassword(password);

        user = await userService.create(
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

        const userPopulate = await userService.findOneById<IUserDoc>(user._id, {
            join: true,
        });

        const map = await userService.payloadSerialization(userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${DatabaseDefaultUUID()}`,
        };

        accessToken = await authService.createAccessToken(payload);
        accessTokenNotFound = await authService.createAccessToken(
            payloadNotFound
        );

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await userService.deleteMany({ _id: user._id });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`POST ${E2E_USER_GRANT_PERMISSION} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_GRANT_PERMISSION)
            .send({
                scope: '123123',
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`POST ${E2E_USER_GRANT_PERMISSION} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_GRANT_PERMISSION)
            .send({
                scope: [ENUM_PERMISSION_GROUP.PERMISSION],
            })
            .set('Authorization', `Bearer ${accessTokenNotFound}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );
    });

    it(`POST ${E2E_USER_GRANT_PERMISSION} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_GRANT_PERMISSION)
            .send({
                scope: [ENUM_PERMISSION_GROUP.PERMISSION],
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});

describe('E2E User Grant Password Payload Encryption', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `aaAA@!123`;

    let user: UserEntity;

    let accessToken: string;

    beforeAll(async () => {
        process.env.AUTH_JWT_PAYLOAD_ENCRYPT = 'true';

        const modRef = await Test.createTestingModule({
            imports: [
                CommonModule,
                RoleModule,
                PermissionModule,
                RoutesModule,
                RouterModule.register([
                    {
                        path: '/',
                        module: RoutesModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CommonModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);

        const role: RoleDoc = await roleService.findOneByName('user');

        const passwordHash = await authService.createPassword(password);

        user = await userService.create(
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

        const userPopulate = await userService.findOneById<IUserDoc>(user._id, {
            join: true,
        });

        const map = await userService.payloadSerialization(userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadHashedAccessToken = await authService.encryptAccessToken(
            payload
        );

        accessToken = await authService.createAccessToken(
            payloadHashedAccessToken
        );

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await userService.deleteMany({ _id: user._id });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`POST ${E2E_USER_GRANT_PERMISSION} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_GRANT_PERMISSION)
            .send({
                scope: [ENUM_PERMISSION_GROUP.PERMISSION],
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
