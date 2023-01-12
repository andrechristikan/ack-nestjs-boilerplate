import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { E2E_USER_LOGIN_URL } from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_AUTH_ACCESS_FOR_DEFAULT } from 'src/common/auth/constants/auth.enum.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

describe('E2E User Login', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;

    const password = `@!${faker.name.firstName().toLowerCase()}${faker.name
        .firstName()
        .toUpperCase()}${faker.datatype.number({ min: 1, max: 99 })}`;

    let user: UserEntity;
    const roleName = faker.random.alphaNumeric(5);
    let passwordExpired: Date;

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
        helperDateService = app.get(HelperDateService);

        await roleService.create({
            name: roleName,
            accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT.USER,
            permissions: [],
        });
        const role: RoleEntity = await roleService.findOne({
            name: roleName,
        });

        passwordExpired = helperDateService.backwardInDays(5);

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

        await app.init();
    });

    afterAll(async () => {
        jest.clearAllMocks();

        try {
            await userService.deleteMany({ _id: user._id });
            await roleService.deleteMany({ name: roleName });
        } catch (err: any) {
            console.error(err);
        }

        await app.close();
    });

    it(`POST ${E2E_USER_LOGIN_URL} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: [1231],
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`POST ${E2E_USER_LOGIN_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: faker.internet.userName(),
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );
    });

    it(`POST ${E2E_USER_LOGIN_URL} Password Not Match`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password: 'Password@@1231',
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR
        );
    });

    it(`POST ${E2E_USER_LOGIN_URL} Password Attempt Max`, async () => {
        await userService.maxPasswordAttempt(user._id);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password: 'Password@@1231',
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR
        );

        await userService.resetPasswordAttempt(user._id);
    });

    it(`POST ${E2E_USER_LOGIN_URL} Inactive`, async () => {
        await userService.inactive(user._id);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        await userService.active(user._id);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR
        );
    });

    it(`POST ${E2E_USER_LOGIN_URL} Role Inactive`, async () => {
        await roleService.inactive(user.role);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        await roleService.active(user.role);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR
        );
    });

    it(`POST ${E2E_USER_LOGIN_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });

    it(`POST ${E2E_USER_LOGIN_URL} Password Expired`, async () => {
        await userService.updatePasswordExpired(user._id, passwordExpired);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR
        );
    });
});

describe('E2E User Login Payload Encryption', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `@!${faker.name.firstName().toLowerCase()}${faker.name
        .firstName()
        .toUpperCase()}${faker.datatype.number({ min: 1, max: 99 })}`;

    let user: UserEntity;
    const roleName = faker.random.alphaNumeric(5);

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

        await roleService.create({
            name: roleName,
            accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT.USER,
            permissions: [],
        });
        const role: RoleEntity = await roleService.findOne({
            name: roleName,
        });

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

        await app.init();
    });

    it(`POST ${E2E_USER_LOGIN_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: true,
            });

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
