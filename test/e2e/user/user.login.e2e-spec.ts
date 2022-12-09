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
import { UserUseCase } from 'src/modules/user/use-cases/user.use-case';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';
import { UserPasswordAttemptDto } from 'src/modules/user/dtos/user.password-attempt.dto';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';

describe('E2E User Login', () => {
    let app: INestApplication;
    let userService: UserService;
    let userUseCase: UserUseCase;
    let authService: AuthService;
    let roleService: RoleService;
    let roleUseCase: RoleUseCase;
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
        userUseCase = app.get(UserUseCase);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        roleUseCase = app.get(RoleUseCase);
        helperDateService = app.get(HelperDateService);

        const dataRole: RoleEntity = await roleUseCase.create({
            name: roleName,
            accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT.USER,
            permissions: [],
        });
        await roleService.create(dataRole);
        const role: RoleEntity = await roleService.findOne({
            name: roleName,
        });

        passwordExpired = helperDateService.backwardInDays(5);

        const passwordHash = await authService.createPassword(password);

        const dataUser: UserEntity = await userUseCase.create(
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
        user = await userService.create(dataUser);

        await app.init();
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

        return;
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

        return;
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

        return;
    });

    it(`POST ${E2E_USER_LOGIN_URL} Password Attempt Max`, async () => {
        const dataMax: UserPasswordAttemptDto =
            await userUseCase.maxPasswordAttempt();
        await userService.updatePasswordAttempt(user._id, dataMax);

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

        const dataReset: UserPasswordAttemptDto =
            await userUseCase.resetPasswordAttempt();
        await userService.updatePasswordAttempt(user._id, dataReset);
        return;
    });

    it(`POST ${E2E_USER_LOGIN_URL} Inactive`, async () => {
        const dataInactive: UserActiveDto = await userUseCase.inactive();
        await userService.updateIsActive(user._id, dataInactive);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        const dataActive: UserActiveDto = await userUseCase.active();
        await userService.updateIsActive(user._id, dataActive);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_LOGIN_URL} Role Inactive`, async () => {
        const dataInactive: RoleActiveDto = await roleUseCase.inactive();
        await roleService.updateIsActive(user.role, dataInactive);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                username: user.username,
                password,
                rememberMe: false,
            });

        const dataActive: RoleActiveDto = await roleUseCase.active();
        await roleService.updateIsActive(user.role, dataActive);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR
        );

        return;
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

        return;
    });

    it(`POST ${E2E_USER_LOGIN_URL} Password Expired`, async () => {
        const dataPasswordExpired: UserPasswordExpiredDto =
            await userUseCase.updatePasswordExpired(passwordExpired);
        await userService.updatePasswordExpired(user._id, dataPasswordExpired);
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

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
            await roleService.deleteOne({ name: roleName });
        } catch (err: any) {
            console.error(err);
        }
    });
});

describe('E2E User Login Payload Encryption', () => {
    let app: INestApplication;
    let userService: UserService;
    let userUseCase: UserUseCase;
    let authService: AuthService;
    let roleService: RoleService;
    let roleUseCase: RoleUseCase;

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
        userUseCase = app.get(UserUseCase);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        roleUseCase = app.get(RoleUseCase);

        const dataRole: RoleEntity = await roleUseCase.create({
            name: roleName,
            accessFor: ENUM_AUTH_ACCESS_FOR_DEFAULT.USER,
            permissions: [],
        });
        await roleService.create(dataRole);
        const role: RoleEntity = await roleService.findOne({
            name: roleName,
        });

        const passwordHash = await authService.createPassword(password);

        const dataUser: UserEntity = await userUseCase.create(
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
        user = await userService.create(dataUser);

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

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
            await roleService.deleteOne({ name: roleName });
        } catch (err: any) {
            console.error(err);
        }
    });
});
