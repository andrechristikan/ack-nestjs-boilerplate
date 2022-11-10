import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import configs from 'src/configs';
import { ConfigModule } from '@nestjs/config';
import { HelperModule } from 'src/common/helper/helper.module';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { IApiKey } from 'src/common/api-key/interfaces/api-key.interface';

describe('ApiKeyBulkService', () => {
    let apiKeyBulkService: ApiKeyBulkKeyService;
    let apiKeyService: ApiKeyService;

    const authApiName: string = faker.random.alphaNumeric(5);

    let authApi: IApiKey;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    connectionName: DATABASE_CONNECTION_NAME,
                    imports: [DatabaseOptionsModule],
                    inject: [DatabaseOptionsService],
                    useFactory: (
                        databaseOptionsService: DatabaseOptionsService
                    ) => databaseOptionsService.createOptions(),
                }),
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                ApiKeyModule,
            ],
            providers: [],
        }).compile();

        apiKeyBulkService =
            moduleRef.get<ApiKeyBulkKeyService>(ApiKeyBulkKeyService);
        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);

        authApi = await apiKeyService.create({
            name: authApiName,
            description: faker.random.alphaNumeric(),
        });
    });

    it('should be defined', async () => {
        expect(apiKeyBulkService).toBeDefined();
    });

    describe('deleteMany', () => {
        it('should return an success', async () => {
            const result = true;
            jest.spyOn(apiKeyBulkService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyBulkService.deleteMany({
                    _id: authApi._id,
                })
            ).toBe(result);
        });
    });

    afterEach(async () => {
        try {
            await apiKeyBulkService.deleteMany({
                _id: authApi._id,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
