import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from 'src/app/app.module';
import {
    E2E_USER_CREATE_URL,
    E2E_USER_FIND_ALL_URL,
    E2E_USER_FIND_ONE_BY_ID_URL,
    E2E_USER_PROFILE_URL,
    E2E_USER_UPDATE_BY_ID_URL,
    E2E_USER_DELETE_BY_ID_URL
} from './user.e2e-constant';
import faker from 'faker';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';

describe('E2E User', () => {
    let app: INestApplication;
    let userService: UserService;
    let authService: AuthService;

    let accessToken: string;
    const adminData: Record<string, any> = {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.name.firstName().toLowerCase(),
        lastName: faker.name.lastName().toLowerCase(),
        mobileNumber: faker.phone.phoneNumber('62###########'),
        password: faker.internet.password(),
        isAdmin: true
    };

    const userData: Record<string, any> = {
        email: faker.internet.email().toLowerCase(),
        firstName: faker.name.firstName().toLowerCase(),
        lastName: faker.name.lastName().toLowerCase(),
        mobileNumber: faker.phone.phoneNumber('62###########'),
        password: faker.internet.password(),
        isAdmin: true
    };

    beforeAll(async () => {
        const modRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = modRef.createNestApplication();
        userService = app.get(UserService);
        authService = app.get(AuthService);

        const admin = await userService.create(adminData);
        adminData._id = admin._id;

        const { _id, email, firstName, lastName, isAdmin, role } = adminData;
        accessToken = await authService.createAccessToken({
            _id,
            email,
            firstName,
            lastName,
            isAdmin,
            role
        });

        await app.init();
    });

    it(`GET ${E2E_USER_FIND_ALL_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(`${E2E_USER_FIND_ALL_URL}?page=1&perPage=10`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .end(done);
    });

    it(`GET ${E2E_USER_PROFILE_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(E2E_USER_PROFILE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .end(done);
    });

    it(`POST ${E2E_USER_CREATE_URL}`, (done) => {
        return request(app.getHttpServer())
            .post(E2E_USER_CREATE_URL)
            .set('Authorization', `Bearer ${accessToken}`)
            .set('Content-Type', `application/json`)
            .send(userData)
            .expect(201)
            .end(done);
    });

    it(`GET USER BY EMAIL`, (done) => {
        return userService.findOneByEmail(userData.email).then((doc) => {
            userData._id = doc._id;
            done();
        });
    });

    it(`GET ${E2E_USER_FIND_ONE_BY_ID_URL}`, (done) => {
        return request(app.getHttpServer())
            .get(E2E_USER_FIND_ONE_BY_ID_URL.replace(':userId', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .end(done);
    });

    it(`PUT ${E2E_USER_UPDATE_BY_ID_URL}`, (done) => {
        return request(app.getHttpServer())
            .put(E2E_USER_UPDATE_BY_ID_URL.replace(':userId', userData._id))
            .send({
                firstName: 'andre',
                lastName: 'kan'
            })
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .end(done);
    });

    it(`DELETE ${E2E_USER_DELETE_BY_ID_URL}`, (done) => {
        return request(app.getHttpServer())
            .delete(E2E_USER_DELETE_BY_ID_URL.replace(':userId', userData._id))
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200)
            .end(done);
    });

    afterAll(async () => {
        await userService.deleteOneById(adminData._id);
        await app.close();
    });
});
