import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';

import { IUserDocument } from 'src/user/user.interface';
import { E2E_AUTH_CHANGE_PASSWORD_URL } from './auth.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { Types, connection } from 'mongoose';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from 'src/auth/service/auth.service';
import { RoleService } from 'src/role/service/role.service';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from 'src/utils/request/request.constant';
import { RouterCommonModule } from 'src/router/router.common.module';
import { UserDocument } from 'src/user/schema/user.schema';
import { RoleDocument } from 'src/role/schema/role.schema';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { useContainer } from 'class-validator';

describe('E2E Change Password', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;

    const password = `aaAA@!123`;
    const newPassword = `bbBB@!456`;

    let user: UserDocument;

    let accessToken: string;
    let accessTokenNotFound: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterCommonModule,
                RouterModule.register([
                    {
                        path: '/',
                        module: RouterCommonModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        useContainer(app.select(CoreModule), { fallbackOnErrors: true });
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        const passwordHash = await authService.createPassword(password);

        user = await userService.create({
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            password: passwordHash.passwordHash,
            passwordExpiredDate: passwordHash.passwordExpiredDate,
            salt: passwordHash.salt,
            email: faker.internet.email(),
            mobileNumber: faker.phone.phoneNumber('62812#########'),
            role: `${role._id}`,
        });

        const userPopulate = await userService.findOneById<IUserDocument>(
            user._id,
            {
                populate: {
                    role: true,
                    permission: true,
                },
            }
        );

        const map = await authService.serializationLogin(userPopulate);
        const payload = await authService.createPayloadAccessToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${new Types.ObjectId()}`,
        };

        accessToken = await authService.createAccessToken(payload);
        accessTokenNotFound = await authService.createAccessToken(
            payloadNotFound
        );
        await app.init();
    });

    it(`PATCH ${E2E_AUTH_CHANGE_PASSWORD_URL} Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_AUTH_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: '123123',
                newPassword: '123',
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`);

        expect(response.status).toEqual(HttpStatus.UNPROCESSABLE_ENTITY);
        expect(response.body.statusCode).toEqual(
            ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_VALIDATION_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_AUTH_CHANGE_PASSWORD_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_AUTH_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessTokenNotFound}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_AUTH_CHANGE_PASSWORD_URL} Old Password Not Match`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_AUTH_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: 'as1231dAA@@!',
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NOT_MATCH_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_AUTH_CHANGE_PASSWORD_URL} New Password must different with old password`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_AUTH_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword: password,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`);

        expect(response.status).toEqual(HttpStatus.BAD_REQUEST);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_NEW_MUST_DIFFERENCE_ERROR
        );

        return;
    });

    it(`PATCH ${E2E_AUTH_CHANGE_PASSWORD_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .patch(E2E_AUTH_CHANGE_PASSWORD_URL)
            .send({
                oldPassword: password,
                newPassword,
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', `${helperDateService.timestamp()}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        try {
            await userService.deleteOneById(user._id);
        } catch (e) {
            console.error(e);
        }

        connection.close();
        await app.close();
    });
});
