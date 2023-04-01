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
import { plainToInstance } from 'class-transformer';
import { UserPayloadSerialization } from 'src/modules/user/serializations/user.payload.serialization';
import { E2E_USER_CHANGE_PASSWORD_URL } from './user.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/common/request/constants/request.status-code.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/constants/user.status-code.constant';
import { RoleService } from 'src/modules/role/services/role.service';
import { RoleModule } from 'src/modules/role/role.module';
import { PermissionModule } from 'src/modules/permission/permission.module';
import {
    UserDoc,
    UserEntity,
} from 'src/modules/user/repository/entities/user.entity';
import {
    RoleDoc,
    RoleEntity,
} from 'src/modules/role/repository/entities/role.entity';
import {
    IUserDoc,
    IUserEntity,
} from 'src/modules/user/interfaces/user.interface';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';

describe('E2E User Change Password', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    const password = `aaAA@!123`;
    const newPassword = `bbBB@!456`;

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

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: '123123',
                newPassword: '123',
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessTokenNotFound}`);
        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Old Password Not Match`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: 'as1231dAA@@!',
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NOT_MATCH_ERROR
        );
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Old Password Password Attempt Max`, async () => {
        await userService.maxPasswordAttempt(user);
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: 'as1231dAA@@!',
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_ATTEMPT_MAX_ERROR
        );

        await userService.resetPasswordAttempt(user);
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} New Password must different with old password`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword: password,
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_PASSWORD_NEW_MUST_DIFFERENCE_ERROR
        );
    });

    it(`PATCH ${E2E_USER_CHANGE_PASSWORD_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_USER_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);
    });
});
