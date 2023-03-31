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
import { IApiKeyCreatedEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import {
    ApiKeyDoc,
    ApiKeyEntity,
} from 'src/common/api-key/repository/entities/api-key.entity';

describe('ApiKeyService', () => {
    const apiKeyName1: string = faker.random.alphaNumeric(15);
    const apiKeyName2: string = faker.random.alphaNumeric(15);
    const apiKeyName3: string = faker.random.alphaNumeric(15);
    let apiKeyService: ApiKeyService;
    let helperDateService: HelperDateService;
    let helperHashService: HelperHashService;
    let apiKeyCreated: IApiKeyCreatedEntity;
    let apiKey: ApiKeyDoc;
    let startDate: Date;
    let endDate: Date;

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
        }).compile();

        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);
        helperDateService = moduleRef.get<HelperDateService>(HelperDateService);
        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);

        apiKeyCreated = await apiKeyService.create({
            name: apiKeyName1,
            description: faker.random.alphaNumeric(20),
        });

        apiKey = await apiKeyService.findOneById(apiKeyCreated._id);

        startDate = helperDateService.backwardInDays(1);
        endDate = helperDateService.forwardInDays(20);
    });

    afterEach(async () => {
        jest.clearAllMocks();

        try {
            await apiKeyService.deleteMany({
                _id: apiKeyCreated._id,
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
            const result: ApiKeyDoc[] = await apiKeyService.findAll(
                { name: apiKeyName1 },
                {
                    paging: { limit: 1, offset: 0 },
                    order: { name: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC },
                }
            );

            jest.spyOn(apiKeyService, 'findAll').mockReturnValueOnce(
                result as any
            );

            const newApiKey: ApiKeyEntity = {
                name: apiKeyCreated.name,
                description: apiKeyCreated.description,
                key: apiKeyCreated.key,
                hash: apiKeyCreated.hash,
                isActive: apiKeyCreated.isActive,
                _id: apiKeyCreated._id,
                createdAt: apiKeyCreated.createdAt,
                updatedAt: apiKeyCreated.updatedAt,
            };

            expect(result).toBeTruthy();
            expect(result.length).toBe(1);
            expect(result[0].toObject()).toEqual(newApiKey);
            expect(result[0]._id).toBe(apiKeyCreated._id);
            expect(result[0].key).toBe(apiKeyCreated.key);
        });
    });

    describe('findOneById', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneById(
                apiKeyCreated._id
            );

            jest.spyOn(apiKeyService, 'findOneById').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKeyCreated._id);
            expect(result.key).toBe(apiKeyCreated.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneById(
                faker.datatype.uuid()
            );

            jest.spyOn(apiKeyService, 'findOneById').mockReturnValueOnce(null);

            expect(result).toBeNull();
        });
    });

    describe('findOne', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOne({
                _id: apiKeyCreated._id,
            });

            jest.spyOn(apiKeyService, 'findOne').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKeyCreated._id);
            expect(result.key).toBe(apiKeyCreated.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOne({
                _id: faker.datatype.uuid(),
            });

            jest.spyOn(apiKeyService, 'findOne').mockReturnValueOnce(null);

            expect(result).toBeNull();
        });
    });

    describe('findOneByKey', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneByKey(
                apiKeyCreated.key
            );
            jest.spyOn(apiKeyService, 'findOneByKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKeyCreated._id);
            expect(result.key).toBe(apiKeyCreated.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneByKey(
                '123123123'
            );

            jest.spyOn(apiKeyService, 'findOneByKey').mockReturnValueOnce(null);

            expect(result).toBeFalsy();
            expect(result).toBeNull();
        });
    });

    describe('findOneByActiveKey', () => {
        it('should return a found apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneByActiveKey(
                apiKeyCreated.key
            );
            jest.spyOn(apiKeyService, 'findOneByActiveKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKeyCreated._id);
            expect(result.key).toBe(apiKeyCreated.key);
        });

        it('should not return a apikey', async () => {
            const result: ApiKeyDoc = await apiKeyService.findOneByActiveKey(
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
            const result: ApiKeyDoc = await apiKeyService.active(apiKey);

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
            const result: ApiKeyDoc = await apiKeyService.inactive(apiKey);

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
            const result: IApiKeyCreatedEntity = await apiKeyService.create({
                name: apiKeyName2,
            });

            jest.spyOn(apiKeyService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(apiKeyName2);
        });

        it('should return a new apikeys with expiration', async () => {
            const result: IApiKeyCreatedEntity = await apiKeyService.create({
                name: apiKeyName3,
                startDate,
                endDate,
            });

            jest.spyOn(apiKeyService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(apiKeyName3);
        });
    });

    describe('createRaw', () => {
        it('should return a new apikeys', async () => {
            const result: IApiKeyCreatedEntity = await apiKeyService.createRaw({
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

        it('should return a new apikeys with expiration', async () => {
            const result: IApiKeyCreatedEntity = await apiKeyService.createRaw({
                name: apiKeyName2,
                description: faker.random.alphaNumeric(),
                key: await apiKeyService.createKey(),
                secret: await apiKeyService.createSecret(),
                startDate,
                endDate,
            });

            jest.spyOn(apiKeyService, 'createRaw').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(apiKeyName2);
        });
    });

    describe('update', () => {
        it('should return a updated apikey', async () => {
            const nameUpdate = faker.random.alphaNumeric(10);
            const result: ApiKeyDoc = await apiKeyService.update(apiKey, {
                name: nameUpdate,
                description: faker.random.alphaNumeric(20),
            });
            jest.spyOn(apiKeyService, 'update').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.name).toBe(nameUpdate);
        });
    });

    describe('updateDate', () => {
        it('should return a updated apikey', async () => {
            const result: ApiKeyEntity = await apiKeyService.updateDate(
                apiKey,
                {
                    startDate,
                    endDate,
                }
            );
            jest.spyOn(apiKeyService, 'updateDate').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
        });
    });

    describe('reset', () => {
        it('old hashed should be difference with new hashed', async () => {
            const hashOld: string = apiKey.hash;
            const secret: string = await apiKeyService.createSecret();
            const result: ApiKeyDoc = await apiKeyService.reset(apiKey, secret);
            jest.spyOn(apiKeyService, 'reset').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
            expect(result.hash).not.toBe(hashOld);
        });
    });

    describe('delete', () => {
        it('should be success to delete', async () => {
            const result: ApiKeyDoc = await apiKeyService.delete(apiKey);

            jest.spyOn(apiKeyService, 'delete').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(apiKey._id);
        });
    });

    describe('validateHashApiKey', () => {
        it('should be succeed', async () => {
            const result: boolean = await apiKeyService.validateHashApiKey(
                apiKeyCreated.hash,
                apiKeyCreated.hash
            );
            jest.spyOn(apiKeyService, 'validateHashApiKey').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be failed', async () => {
            const result: boolean = await apiKeyService.validateHashApiKey(
                apiKeyCreated.hash,
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
                _id: apiKeyCreated._id,
            });

            jest.spyOn(apiKeyService, 'deleteMany').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('inactiveManyByEndDate', () => {
        it('should be succeed', async () => {
            const result: boolean = await apiKeyService.inactiveManyByEndDate();

            jest.spyOn(
                apiKeyService,
                'inactiveManyByEndDate'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });
});
