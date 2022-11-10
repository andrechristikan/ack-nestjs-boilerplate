import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { faker } from '@faker-js/faker';
import { INTEGRATION_DATABASE_URL } from './database.constant';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { CommonModule } from 'src/common/common.module';
import { RoutesModule } from 'src/router/routes/routes.module';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';

describe('Database Integration', () => {
    let app: INestApplication;
    let helperDateService: HelperDateService;
    let apiKeyService: ApiKeyService;

    const apiKey = 'qwertyuiop12345zxcvbnmkjh';
    let xApiKey: string;
    let timestamp: number;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CommonModule, RoutesModule],
            controllers: [],
        }).compile();

        app = moduleRef.createNestApplication();
        helperDateService = app.get(HelperDateService);
        apiKeyService = app.get(ApiKeyService);

        timestamp = helperDateService.timestamp();
        const apiEncryption = await apiKeyService.encryptApiKey(
            {
                key: apiKey,
                timestamp,
                hash: 'e11a023bc0ccf713cb50de9baa5140e59d3d4c52ec8952d9ca60326e040eda54',
            },
            'opbUwdiS1FBsrDUoPgZdx',
            'cuwakimacojulawu'
        );
        xApiKey = `${apiKey}:${apiEncryption}`;

        await app.init();
    });

    it(`GET ${INTEGRATION_DATABASE_URL} Success`, async () => {
        const response = await request(app.getHttpServer())
            .get(INTEGRATION_DATABASE_URL)
            .set('user-agent', faker.internet.userAgent())
            .set('x-timestamp', timestamp.toString())
            .set('x-api-key', xApiKey);

        expect(response.status).toEqual(HttpStatus.OK);
        expect(response.body.statusCode).toEqual(HttpStatus.OK);

        return;
    });

    afterAll(async () => {
        await app.close();
    });
});
