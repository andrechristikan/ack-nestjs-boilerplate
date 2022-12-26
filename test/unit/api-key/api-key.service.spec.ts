import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { HelperModule } from 'src/common/helper/helper.module';
import { ConfigModule } from '@nestjs/config';
import configs from 'src/configs';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';

describe('ApiKeyService', () => {
    const apiKeyName1: string = faker.random.alphaNumeric(15);
    const apiKeyName2: string = faker.random.alphaNumeric(15);
    const apiKeyName3: string = faker.random.alphaNumeric(15);
    let apiKeyService: ApiKeyService;
    let helperHashService: HelperHashService;
    let apiKey: IApiKeyEntity;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    connectionName: DATABASE_CONNECTION_NAME,
                    imports: [DatabaseOptionsModule],
                    inject: [DatabaseOptionsService],
                    useFactory: (
                        databaseOptionsService: DatabaseOptionsService
                    ) => databaseOptionsService.createMongoOptions(),
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
        }).compile();

        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);
        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);

        apiKey = await apiKeyService.create({
            name: apiKeyName1,
            description: faker.random.alphaNumeric(20),
        });
    });

    afterEach(async () => {
        jest.clearAllMocks();

        try {
            await apiKeyService.deleteOne({
                _id: apiKey._id,
            });
            await apiKeyService.deleteMany({
                name: { $in: [apiKeyName1, apiKeyName2, apiKeyName3] },
            });
        } catch (err: any) {
            console.error(err);
        }
    });

    it('should be defined', () => {
        expect(apiKeyService).toBeDefined();
    });

    describe('findAll', () => {
        it('should return the array of apikeys', async () => {
            const result: ApiKeyEntity[] = await apiKeyService.findAll(
                { name: apiKeyName1 },
                {
                    paging: { limit: 1, offset: 0 },
                    sort: { name: ENUM_PAGINATION_SORT_TYPE.ASC },
                }
            );

            jest.spyOn(apiKeyService, 'findAll').mockReturnValueOnce(
                result as any
            );

            const newApiKey: ApiKeyEntity = {
                name: apiKey.name,
                description: apiKey.description,
                key: apiKey.key,
                hash: apiKey.hash,
                isActive: apiKey.isActive,
                _id: apiKey._id,
                createdAt: apiKey.createdAt,
                updatedAt: apiKey.updatedAt,
            };

            expect(result).toBeTruthy();
            expect(result.length).toBe(1);
            expect(result[0]).toEqual(newApiKey);
            expect(result[0]._id).toBe(apiKey._id);
            expect(result[0].key).toBe(apiKey.key);
        });
    });

    describe('findOneById', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneById(
                apiKey._id
            );

            jest.spyOn(apiKeyService, 'findOneById').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.key).toBe(apiKey.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneById(
                faker.datatype.uuid()
            );

            jest.spyOn(apiKeyService, 'findOneById').mockReturnValueOnce(null);

            expect(result).toBeNull();
        });
    });

    describe('findOne', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOne({
                _id: apiKey._id,
            });

            jest.spyOn(apiKeyService, 'findOne').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.key).toBe(apiKey.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOne({
                _id: faker.datatype.uuid(),
            });

            jest.spyOn(apiKeyService, 'findOne').mockReturnValueOnce(null);

            expect(result).toBeNull();
        });
    });

    describe('findOneByKey', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneByKey(
                apiKey.key
            );
            jest.spyOn(apiKeyService, 'findOneByKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.key).toBe(apiKey.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneByKey(
                '123123123'
            );

            jest.spyOn(apiKeyService, 'findOneByKey').mockReturnValueOnce(null);

            expect(result).toBeFalsy();
            expect(result).toBeNull();
        });
    });

    describe('findOneByActiveKey', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneByActiveKey(
                apiKey.key
            );
            jest.spyOn(apiKeyService, 'findOneByActiveKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.key).toBe(apiKey.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneByActiveKey(
                '123123123'
            );

            jest.spyOn(apiKeyService, 'findOneByActiveKey').mockReturnValueOnce(
                null
            );

            expect(result).toBeFalsy();
            expect(result).toBeNull();
        });
    });

    describe('getTotal', () => {
        it('should return total data of apikeys', async () => {
            const result: number = await apiKeyService.getTotal({
                name: apiKeyName1,
            });

            jest.spyOn(apiKeyService, 'getTotal').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(1);
        });
    });

    describe('active', () => {
        it('should make apikey to be active', async () => {
            const result: ApiKeyEntity = await apiKeyService.active(apiKey._id);

            jest.spyOn(apiKeyService, 'active').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.isActive).toBe(true);
        });
    });

    describe('inactive', () => {
        it('should make apikey to be inactive', async () => {
            const result: ApiKeyEntity = await apiKeyService.inactive(
                apiKey._id
            );

            jest.spyOn(apiKeyService, 'inactive').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.isActive).toBe(false);
        });
    });

    describe('create', () => {
        it('should return a new apikeys', async () => {
            const result: IApiKeyEntity = await apiKeyService.create({
                name: apiKeyName2,
            });

            jest.spyOn(apiKeyService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(apiKeyName2);
        });
    });

    describe('createRaw', () => {
        it('should return a new apikeys', async () => {
            const result: IApiKeyEntity = await apiKeyService.createRaw({
                name: apiKeyName3,
                description: faker.random.alphaNumeric(),
                key: await apiKeyService.createKey(),
                secret: await apiKeyService.createSecret(),
            });

            jest.spyOn(apiKeyService, 'createRaw').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(apiKeyName3);
        });
    });

    describe('updateName', () => {
        it('should return a updated apikey', async () => {
            const nameUpdate = faker.random.alphaNumeric(10);
            const result: ApiKeyEntity = await apiKeyService.updateName(
                apiKey._id,
                {
                    name: nameUpdate,
                    description: faker.random.alphaNumeric(20),
                }
            );
            jest.spyOn(apiKeyService, 'updateName').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.name).toBe(nameUpdate);
        });
    });

    describe('reset', () => {
        it('old hashed should be difference with new hashed', async () => {
            const result: IApiKeyEntity = await apiKeyService.reset(
                apiKey._id,
                apiKey.key
            );
            jest.spyOn(apiKeyService, 'reset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.hash).not.toBe(apiKey.hash);
        });
    });

    describe('deleteOneById', () => {
        it('should be success to delete', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOneById(
                apiKey._id
            );

            jest.spyOn(apiKeyService, 'deleteOneById').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
        });

        it('should be not found', async () => {
            await apiKeyService.deleteOneById(apiKey._id);
            const result: ApiKeyEntity = await apiKeyService.deleteOneById(
                apiKey._id
            );

            jest.spyOn(apiKeyService, 'deleteOneById').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBeNull();
        });
    });

    describe('deleteOne', () => {
        it('should be success to delete', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOne({
                _id: apiKey._id,
            });

            jest.spyOn(apiKeyService, 'deleteOne').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
        });

        it('should be not found', async () => {
            await apiKeyService.deleteOne({
                _id: apiKey._id,
            });
            const result: ApiKeyEntity = await apiKeyService.deleteOne({
                _id: apiKey._id,
            });

            jest.spyOn(apiKeyService, 'deleteOne').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBeNull();
        });
    });

    describe('validateHashApiKey', () => {
        it('should be succeed', async () => {
            const result: boolean = await apiKeyService.validateHashApiKey(
                apiKey.hash,
                apiKey.hash
            );
            jest.spyOn(apiKeyService, 'validateHashApiKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = await apiKeyService.validateHashApiKey(
                apiKey.hash,
                faker.random.alphaNumeric(12)
            );

            jest.spyOn(apiKeyService, 'validateHashApiKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });

    describe('createKey', () => {
        it('should return a string', async () => {
            const result: string = await apiKeyService.createKey();

            jest.spyOn(apiKeyService, 'createKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('createSecret', () => {
        it('should return a string', async () => {
            const result: string = await apiKeyService.createSecret();

            jest.spyOn(apiKeyService, 'createSecret').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
        });
    });

    describe('createKey', () => {
        it('should return a hashed string', async () => {
            const key1: string = await apiKeyService.createKey();
            const secret1: string = await apiKeyService.createSecret();
            const hashed: string = helperHashService.sha256(
                `${key1}:${secret1}`
            );
            const result: string = await apiKeyService.createHashApiKey(
                key1,
                secret1
            );

            jest.spyOn(apiKeyService, 'createHashApiKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(hashed);
        });
    });

    describe('deleteMany', () => {
        it('should be succeed', async () => {
            const result: boolean = await apiKeyService.deleteMany({
                _id: apiKey._id,
            });

            jest.spyOn(apiKeyService, 'deleteMany').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });
});
