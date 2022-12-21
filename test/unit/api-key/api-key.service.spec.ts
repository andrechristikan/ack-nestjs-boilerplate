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
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';

describe('ApiKeyService', () => {
    let apiKeyService: ApiKeyService;

    const apiKeyName: string = faker.random.alphaNumeric(5);

    let apiKey: IApiKeyEntity;

    beforeAll(async () => {
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
            providers: [],
        }).compile();

        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);

        apiKey = await apiKeyService.create({
            name: apiKeyName,
            description: faker.random.alphaNumeric(),
        });
    });

    describe('create', () => {
        it('should return an success', async () => {
            const data = {
                name: apiKeyName,
                description: faker.random.alphaNumeric(),
            };

            const result: IApiKeyEntity = await apiKeyService.create(data);
            jest.spyOn(apiKeyService, 'create').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.create(data)).toBe(result);
        });
    });

    describe('createRaw', () => {
        it('should return an success', async () => {
            const data = {
                name: apiKeyName,
                description: faker.random.alphaNumeric(),
                key: await apiKeyService.createKey(),
                secret: await apiKeyService.createSecret(),
            };

            const result: IApiKeyEntity = await apiKeyService.createRaw(data);
            jest.spyOn(apiKeyService, 'createRaw').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.createRaw(data)).toBe(result);
        });
    });

    describe('getTotal', () => {
        it('should return an success', async () => {
            const result: number = await apiKeyService.getTotal({});
            jest.spyOn(apiKeyService, 'getTotal').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.getTotal({})).toBe(result);
        });
    });

    describe('findOneById', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOneById(
                `${apiKey._id}`
            );
            jest.spyOn(apiKeyService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOneById(`${apiKey._id}`)).toBe(
                result
            );
        });
    });

    describe('findOne', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOne({
                _id: apiKey._id,
            });
            jest.spyOn(apiKeyService, 'findOne').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOne({ _id: apiKey._id })).toBe(
                result
            );
        });
    });

    describe('findOneByKey', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${apiKey._id}`
            );

            const result: ApiKeyEntity = await apiKeyService.findOneByKey(
                findOne.key
            );
            jest.spyOn(apiKeyService, 'findOneByKey').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOneByKey(findOne.key)).toBe(result);
        });
    });

    describe('findOneByActiveKey', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${apiKey._id}`
            );

            const result: ApiKeyEntity = await apiKeyService.findOneByActiveKey(
                findOne.key
            );
            jest.spyOn(apiKeyService, 'findOneByActiveKey').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOneByActiveKey(findOne.key)).toBe(
                result
            );
        });
    });

    describe('active', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.active(apiKey._id);
            jest.spyOn(apiKeyService, 'active').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.active(apiKey._id)).toBe(result);
        });
    });

    describe('inactive', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.inactive(
                apiKey._id
            );
            jest.spyOn(apiKeyService, 'inactive').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.inactive(apiKey._id)).toBe(result);
        });
    });

    describe('findAll', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity[] = await apiKeyService.findAll(
                {},
                { paging: { limit: 1, skip: 1 } }
            );
            jest.spyOn(apiKeyService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.findAll(
                    {},
                    { paging: { limit: 1, skip: 1 } }
                )
            ).toBe(result);
        });

        it('should return an success with limit and offset', async () => {
            const result: ApiKeyEntity[] = await apiKeyService.findAll(
                {},
                { paging: { limit: 1, skip: 1 } }
            );
            jest.spyOn(apiKeyService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.findAll(
                    {},
                    { paging: { limit: 1, skip: 1 } }
                )
            ).toBe(result);
        });

        it('should return an success with limit, offset, and sort', async () => {
            const result: ApiKeyEntity[] = await apiKeyService.findAll(
                {},
                {
                    paging: { limit: 1, skip: 1 },
                    sort: { name: ENUM_PAGINATION_SORT_TYPE.ASC },
                }
            );
            jest.spyOn(apiKeyService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.findAll(
                    {},
                    {
                        paging: { limit: 1, skip: 1 },
                        sort: { name: ENUM_PAGINATION_SORT_TYPE.ASC },
                    }
                )
            ).toBe(result);
        });
    });

    describe('updateName', () => {
        it('should return an success', async () => {
            const data = {
                name: faker.random.alphaNumeric(10),
                description: faker.random.alphaNumeric(20),
            };
            const result: ApiKeyEntity = await apiKeyService.updateName(
                `${apiKey._id}`,
                data
            );
            jest.spyOn(apiKeyService, 'updateName').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.updateName(`${apiKey._id}`, data)).toBe(
                result
            );
        });
    });

    describe('reset', () => {
        it('should return an success', async () => {
            const result: IApiKeyEntity = await apiKeyService.reset(
                apiKey._id,
                apiKey.key
            );
            jest.spyOn(apiKeyService, 'reset').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.reset(apiKey._id, apiKey.key)).toBe(
                result
            );
        });
    });

    describe('deleteOneById', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOneById(
                `${apiKey._id}`
            );
            jest.spyOn(apiKeyService, 'deleteOneById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.deleteOneById(`${apiKey._id}`)).toBe(
                result
            );
        });
    });

    describe('validateHashApiKey', () => {
        it('should return an success', async () => {
            const result: boolean = await apiKeyService.validateHashApiKey(
                apiKey.hash,
                apiKey.hash
            );
            jest.spyOn(apiKeyService, 'validateHashApiKey').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.validateHashApiKey(apiKey.hash, apiKey.hash)
            ).toBe(result);
        });
    });

    describe('deleteOne', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOne({
                _id: `${apiKey._id}`,
            });
            jest.spyOn(apiKeyService, 'deleteOne').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.deleteOne({ _id: `${apiKey._id}` })
            ).toBe(result);
        });
    });

    describe('deleteMany', () => {
        it('should return an success', async () => {
            const result: boolean = await apiKeyService.deleteMany({
                _id: `${apiKey._id}`,
            });
            jest.spyOn(apiKeyService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.deleteMany({
                    _id: `${apiKey._id}`,
                })
            ).toBe(result);
        });
    });

    afterAll(async () => {
        try {
            await apiKeyService.deleteOne({
                _id: apiKey._id,
            });
            await apiKeyService.deleteMany({
                name: apiKeyName,
            });
        } catch (err: any) {
            console.error(err);
        }
    });
});
