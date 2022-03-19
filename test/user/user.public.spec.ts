import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import faker from '@faker-js/faker';
import { IUserDocument } from 'src/user/user.interface';
import {
    E2E_USER_PUBLIC_PROFILE_UPLOAD_URL,
    E2E_USER_PUBLIC_PROFILE_URL,
} from './user.constant';
import { Types, connection } from 'mongoose';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/user/user.constant';
import { CoreModule } from 'src/core/core.module';
import { RouterModule } from '@nestjs/core';
import { UserService } from 'src/user/service/user.service';
import { AuthService } from 'src/auth/service/auth.service';
import { RoleService } from 'src/role/service/role.service';
import { ENUM_FILE_STATUS_CODE_ERROR } from 'src/utils/file/file.constant';
import { RouterPublicModule } from 'src/router/router.public.module';
import { RoleDocument } from 'src/role/schema/role.schema';
import { UserDocument } from 'src/user/schema/user.schema';

describe('E2E User Public', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;
    let roleService: RoleService;

    let user: UserDocument;

    let accessToken: string;
    let accessTokenNotFound: string;

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [
                CoreModule,
                RouterPublicModule,
                RouterModule.register([
                    {
                        path: '/public',
                        module: RouterPublicModule,
                    },
                ]),
            ],
        }).compile();

        app = modRef.createNestApplication();
        userService = app.get(UserService);
        authService = app.get(AuthService);
        roleService = app.get(RoleService);

        const role: RoleDocument = await roleService.findOne({
            name: 'user',
        });

        const passwordHash = await authService.createPassword(
            faker.random.alphaNumeric()
        );

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

        const map = await authService.mapLogin(userPopulate);
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

    it(`GET ${E2E_USER_PUBLIC_PROFILE_URL} Profile Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PUBLIC_PROFILE_URL)
            .set('Authorization', `Bearer ${accessTokenNotFound}`);

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`GET ${E2E_USER_PUBLIC_PROFILE_URL} Profile`, async () => {
        const response = await request(app.getHttpServer())
            .get(E2E_USER_PUBLIC_PROFILE_URL)
            .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Error Request`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .attach('file', './test/user/files/test.txt')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data');

        expect(response.status).toEqual(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
        expect(response.body.statusCode).toEqual(
            ENUM_FILE_STATUS_CODE_ERROR.FILE_EXTENSION_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Not Found`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .attach('file', './test/user/files/test.txt')
            .set('Authorization', `Bearer ${accessTokenNotFound}`)
            .set('Content-Type', 'multipart/form-data');

        expect(response.status).toEqual(HttpStatus.NOT_FOUND);
        expect(response.body.statusCode).toEqual(
            ENUM_USER_STATUS_CODE_ERROR.USER_NOT_FOUND_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload File Too Large`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './test/user/files/medium.jpg')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data');

        expect(response.status).toEqual(HttpStatus.PAYLOAD_TOO_LARGE);
        expect(response.body.statusCode).toEqual(
            ENUM_FILE_STATUS_CODE_ERROR.FILE_MAX_SIZE_ERROR
        );

        return;
    });

    it(`POST ${E2E_USER_PUBLIC_PROFILE_UPLOAD_URL} Profile Upload Success`, async () => {
        const response = await request(app.getHttpServer())
            .post(E2E_USER_PUBLIC_PROFILE_UPLOAD_URL)
            .send()
            .attach('file', './test/user/files/small.jpg')
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', 'multipart/form-data');

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    }, 5000);

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
