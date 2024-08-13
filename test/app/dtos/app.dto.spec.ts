import 'reflect-metadata';
import { faker } from '@faker-js/faker';
import { plainToInstance } from 'class-transformer';
import { AppEnvDto } from 'src/app/dtos/app.env.dto';
import {
    ENUM_APP_ENVIRONMENT,
    ENUM_APP_TIMEZONE,
} from 'src/app/enums/app.enum';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/enums/message.enum';

describe('AppEnvDto', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('Should be successful calls', () => {
        const response: AppEnvDto = {
            APP_NAME: faker.lorem.word(),
            APP_ENV: ENUM_APP_ENVIRONMENT.DEVELOPMENT,
            APP_LANGUAGE: ENUM_MESSAGE_LANGUAGE.EN,
            APP_TIMEZONE: ENUM_APP_TIMEZONE.ASIA_JAKARTA,
            APP_DEBUG: false,

            HTTP_ENABLE: true,
            HTTP_HOST: 'localhost',
            HTTP_PORT: 3000,

            URL_VERSIONING_ENABLE: true,
            URL_VERSION: 1,

            DATABASE_URI: faker.internet.url(),
            DATABASE_DEBUG: false,

            AUTH_JWT_ISSUER: faker.internet.url(),
            AUTH_JWT_AUDIENCE: faker.lorem.word(),

            AUTH_JWT_ACCESS_TOKEN_EXPIRED: '1h',
            AUTH_JWT_ACCESS_TOKEN_SECRET_KEY: faker.string.alphanumeric({
                length: 10,
            }),
            AUTH_JWT_REFRESH_TOKEN_EXPIRED: '182d',
            AUTH_JWT_REFRESH_TOKEN_SECRET_KEY: faker.string.alphanumeric({
                length: 10,
            }),

            AUTH_SOCIAL_GOOGLE_CLIENT_ID: faker.string.alphanumeric({
                length: 10,
            }),
            AUTH_SOCIAL_GOOGLE_CLIENT_SECRET: faker.string.alphanumeric({
                length: 10,
            }),

            AUTH_SOCIAL_APPLE_CLIENT_ID: faker.string.alphanumeric({
                length: 10,
            }),
            AUTH_SOCIAL_APPLE_SIGN_IN_CLIENT_ID: faker.string.alphanumeric({
                length: 10,
            }),

            AWS_S3_CREDENTIAL_KEY: faker.string.alphanumeric({
                length: 5,
            }),
            AWS_S3_CREDENTIAL_SECRET: faker.string.alphanumeric({
                length: 10,
            }),
            AWS_S3_REGION: faker.lorem.word(),
            AWS_S3_BUCKET: faker.lorem.word(),
            AWS_SES_CREDENTIAL_KEY: faker.string.alphanumeric({
                length: 5,
            }),
            AWS_SES_CREDENTIAL_SECRET: faker.string.alphanumeric({
                length: 10,
            }),
            AWS_SES_REGION: faker.lorem.word(),

            REDIS_HOST: faker.internet.url(),
            REDIS_PORT: 3001,
            REDIS_PASSWORD: faker.string.alphanumeric({
                length: 10,
            }),
            REDIS_TLS: false,

            SENTRY_DSN: faker.internet.url(),

            CLIENT_URL: faker.internet.url(),
        };

        const dto = plainToInstance(AppEnvDto, response);

        expect(dto).toBeInstanceOf(AppEnvDto);
    });
});
