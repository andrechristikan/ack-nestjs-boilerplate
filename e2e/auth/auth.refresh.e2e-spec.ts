import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';
import { E2E_AUTH_REFRESH_URL } from './auth.constant';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { UserDocument } from 'src/user/schema/user.schema';
import { RoleDocument } from 'src/role/schema/role.schema';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/auth/auth.constant';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/role/role.constant';
import { IUserDocument } from 'src/user/user.interface';
import { Types, connection } from 'mongoose';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from 'src/auth/service/auth.service';
import { RoleService } from 'src/role/service/role.service';
import { HelperDateService } from 'src/utils/helper/service/helper.date.service';
import { RouterCommonModule } from 'src/router/router.common.module';

describe('E2E Refresh', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;
    let helperDateService: HelperDateService;

    const password = `@!${faker.random
        .alphaNumeric(5)
        .toLowerCase()}${faker.random.alphaNumeric(5).toUpperCase()}`;

    let user: UserDocument;
    let passwordExpiredDate: Date;
    let passwordExpiredForward: Date;

    let refreshToken: string;
    let refreshTokenNotFound: string;

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
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);
        helperDateService = app.get(HelperDateService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        passwordExpiredDate = helperDateService.backwardInDays(5);
        passwordExpiredForward = helperDateService.forwardInDays(5);

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
                version: 1,
            }
        );

        const map = await authService.mapLogin(userPopulate, { version: 1 });
        const payload = await authService.createPayloadRefreshToken(map, false);
        const payloadNotFound = {
            ...payload,
            _id: `${new Types.ObjectId()}`,
        };

        refreshToken = await authService.createRefreshToken(
            payload,
            false,
            true
        );
        refreshTokenNotFound = await authService.createRefreshToken(
            payloadNotFound,
            false,
            true
        );

        await app.init();
    });

    it(`POST ${E2E_AUTH_REFRESH_URL} Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshTokenNotFound}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_REFRESH_URL} Inactive`, async () => {
        await userService.inactive(user._id);
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        await userService.active(user._id);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_REFRESH_URL} Role Inactive`, async () => {
        await roleService.inactive(`${user.role}`);
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        await roleService.active(`${user.role}`);
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_ROLE_STATUS_CODE_ERROR.ROLE_IS_INACTIVE_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_REFRESH_URL} Password Expired`, async () => {
        await userService.updatePasswordExpired(user._id, passwordExpiredDate);
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

        await userService.updatePasswordExpired(
            user._id,
            passwordExpiredForward
        );
        expect(response.status).toEqual(HttpStatus.FORBIDDEN);
        expect(response.body.statusCode).toEqual(
            ENUM_AUTH_STATUS_CODE_ERROR.AUTH_PASSWORD_EXPIRED_ERROR
        );

        return;
    });

    it(`POST ${E2E_AUTH_REFRESH_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_AUTH_REFRESH_URL)
            .set('Authorization', `Bearer ${refreshToken}`);

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
