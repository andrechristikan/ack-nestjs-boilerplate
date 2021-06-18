import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { E2E_AUTH_LOGIN_URL } from 'e2e/auth/auth.e2e-constant';
import { AppModule } from 'src/app/app.module';
import faker from 'faker';
import { UserService } from 'src/user/user.service';

describe('E2E Auth', () => {
    let app: INestApplication;
    let userService: UserService;
    let userId: string;
    const user: Record<string, any> = {
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

        const create = await userService.create(user);
        userId = create._id;

        await app.init();
    });

    it(`POST ${E2E_AUTH_LOGIN_URL}`, (done) => {
        return request(app.getHttpServer())
            .post(E2E_AUTH_LOGIN_URL)
            .set('Content-Type', 'application/json')
            .send({
                email: user.email,
                password: user.password
            })
            .expect(200)
            .end(done);
    });

    afterAll(async () => {
        await userService.deleteOneById(userId);
        await app.close();
    });
});
