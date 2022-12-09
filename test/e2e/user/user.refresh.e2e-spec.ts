import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { RouterModule } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { UserService } from 'src/modules/user/services/user.service';
import { AuthService } from 'src/common/auth/services/auth.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { plainToInstance } from 'class-transformer';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { E2E_USER_REFRESH_URL } from './user.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/constants/role.status-code.constant';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { IUserEntity } from 'src/modules/user/interfaces/user.interface';
import { UserUseCase } from 'src/modules/user/use-cases/user.use-case';
import { UserActiveDto } from 'src/modules/user/dtos/user.active.dto';
import { RoleUseCase } from 'src/modules/role/use-cases/role.use-case';
import { RoleActiveDto } from 'src/modules/role/dtos/role.active.dto';
import { UserPasswordExpiredDto } from 'src/modules/user/dtos/user.password-expired.dto';

describe('E2E User Refresh', () => {
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
    let passwordExpired: Date;
    let passwordExpiredForward: Date;

    let refreshToken: string;
    let refreshTokenNotFound: string;

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

        const role: RoleEntity = await roleService.findOne({
            name: 'user',
        });

        passwordExpired = helperDateService.backwardInDays(5);
        passwordExpiredForward = helperDateService.forwardInDays(5);

        const passwordHash = await authService.createPassword(password);

        const data: UserEntity = await userUseCase.create(
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
        user = await userService.create(data);

        const userPopulate = await userService.findOneById<IUserEntity>(
            user._id,
            {
                join: true,
            }
        );

        const map = plainToInstance(UserPayloadSerialization, userPopulate);
        const payload = await authService.createPayloadRefreshToken(
            map._id,
            false
        );
        const payloadNotFound = {
            ...payload,
            _id: `${DatabaseDefaultUUID()}`,
        };

        refreshToken = await authService.createRefreshToken(payload, {
            rememberMe: false,
            notBeforeExpirationTime: '0',
        });
        refreshTokenNotFound = await authService.createRefreshToken(
            payloadNotFound,
            {
                rememberMe: false,
                notBeforeExpirationTime: '0',
            }
        );

        await app.init();
    });

    it(`POST ${E2E_USER_REFRESH_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshTokenNotFound}`);
        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Inactive`, async () => {
        const dataInactive: UserActiveDto = await userUseCase.inactive();
        await userService.updateIsActive(user._id, dataInactive);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        const dataActive: UserActiveDto = await userUseCase.active();
        await userService.updateIsActive(user._id, dataActive);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Role Inactive`, async () => {
        const dataInactive: RoleActiveDto = await roleUseCase.inactive();
        await roleService.updateIsActive(user.role, dataInactive);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        const dataActive: RoleActiveDto = await roleUseCase.active();
        await roleService.updateIsActive(user.role, dataActive);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Password Expired`, async () => {
        const dataPasswordExpired: UserPasswordExpiredDto =
            await userUseCase.updatePasswordExpired(passwordExpired);
        await userService.updatePasswordExpired(user._id, dataPasswordExpired);

        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        const dataPasswordExpiredForward: UserPasswordExpiredDto =
            await userUseCase.updatePasswordExpired(passwordExpiredForward);
        await userService.updatePasswordExpired(
            user._id,
            dataPasswordExpiredForward
        );

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_EXPIRED_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_REFRESH_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);
        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
        } catch (err: any) {
            console.error(err);
        }
    });
});

describe('E2E User Refresh Payload Encryption', () => {
    let app: INestApplication;
    let userService: UserService;
    let userUseCase: UserUseCase;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `@!${faker.name.firstName().toLowerCase()}${faker.name
        .firstName()
        .toUpperCase()}${faker.datatype.number({ min: 1, max: 99 })}`;

    let user: UserEntity;

    let refreshToken: string;

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

        const role: RoleEntity = await roleService.findOne({
            name: 'user',
        });

        const passwordHash = await authService.createPassword(password);

        const data: UserEntity = await userUseCase.create(
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
        user = await userService.create(data);

        const userPopulate = await userService.findOneById<IUserEntity>(
            user._id,
            {
                join: true,
            }
        );

        const map = plainToInstance(UserPayloadSerialization, userPopulate);
        const payload = await authService.createPayloadRefreshToken(
            map._id,
            false
        );

        const payloadHashedRefreshToken: string =
            await authService.encryptRefreshToken(payload);

        refreshToken = await authService.createRefreshToken(
            payloadHashedRefreshToken,
            {
                rememberMe: true,
                notBeforeExpirationTime: '0',
            }
        );

        await app.init();
    });

    it(`POST ${E2E_USER_REFRESH_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
        } catch (err: any) {
            console.error(err);
        }
    });
});
