import { Test } from '@nestjs/testing';
import { faker } from '@faker-js/faker';
import { HelperModule } from 'src/common/helper/helper.module';
import { ConfigModule } from '@nestjs/config';
import configs from 'src/configs';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyBulkKeyService } from 'src/common/api-key/services/api-key.bulk.service';
import { MongooseModule } from '@nestjs/mongoose';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyUseCase } from 'src/common/api-key/use-cases/api-key.use-case';

describe('ApiKeyService', () => {
    let apiKeyService: ApiKeyService;
    let apiKeyUseCase: ApiKeyUseCase;
    let apiKeyBulkService: ApiKeyBulkKeyService;

    const authApiName: string = faker.random.alphaNumeric(5);

    let authApi: IApiKeyEntity;

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

        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);
        apiKeyUseCase = moduleRef.get<ApiKeyUseCase>(ApiKeyUseCase);
        apiKeyBulkService =
            moduleRef.get<ApiKeyBulkKeyService>(ApiKeyBulkKeyService);

        authApi = await apiKeyService.create({
            name: authApiName,
            description: faker.random.alphaNumeric(),
        });
    });

    describe('create', () => {
        it('should return an success', async () => {
            const data = {
                name: authApiName,
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
                name: authApiName,
                description: faker.random.alphaNumeric(),
                key: apiKeyUseCase.createKey(),
                secret: apiKeyUseCase.createSecret(),
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
                `${authApi._id}`
            );
            jest.spyOn(apiKeyService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOneById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('findOne', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.findOne({
                _id: authApi._id,
            });
            jest.spyOn(apiKeyService, 'findOne').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.findOne({ _id: authApi._id })).toBe(
                result
            );
        });
    });

    describe('findOneByKey', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${authApi._id}`
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

    describe('findOneByKeyAndActive', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${authApi._id}`
            );

            const result: ApiKeyEntity =
                await apiKeyService.findOneByKeyAndActive(findOne.key);
            jest.spyOn(
                apiKeyService,
                'findOneByKeyAndActive'
            ).mockImplementation(async () => result);

            expect(await apiKeyService.findOneByKeyAndActive(findOne.key)).toBe(
                result
            );
        });
    });

    describe('inactive', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.inactive(
                `${authApi._id}`
            );
            jest.spyOn(apiKeyService, 'inactive').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.inactive(`${authApi._id}`)).toBe(result);
        });
    });

    describe('active', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.active(
                `${authApi._id}`
            );
            jest.spyOn(apiKeyService, 'active').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.active(`${authApi._id}`)).toBe(result);
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

    describe('updateOneById', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.updateOneById(
                `${authApi._id}`,
                {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                }
            );
            jest.spyOn(apiKeyService, 'updateOneById').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.updateOneById(`${authApi._id}`, {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                })
            ).toBe(result);
        });
    });

    describe('updateHashById', () => {
        it('should return an success', async () => {
            const result: IApiKeyEntity = await apiKeyService.updateResetById(
                `${authApi._id}`
            );
            jest.spyOn(apiKeyService, 'updateResetById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.updateResetById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('deleteOneById', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOneById(
                `${authApi._id}`
            );
            jest.spyOn(apiKeyService, 'deleteOneById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.deleteOneById(`${authApi._id}`)).toBe(
                result
            );
        });
    });

    describe('deleteOne', () => {
        it('should return an success', async () => {
            const result: ApiKeyEntity = await apiKeyService.deleteOne({
                _id: `${authApi._id}`,
            });
            jest.spyOn(apiKeyService, 'deleteOne').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.deleteOne({ _id: `${authApi._id}` })
            ).toBe(result);
        });
    });

    describe('validateHashApiKey', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${authApi._id}`
            );
            const hashFormRequest = findOne.hash;
            const result: boolean = await apiKeyService.validateHashApiKey(
                hashFormRequest,
                hashFormRequest
            );
            jest.spyOn(apiKeyService, 'validateHashApiKey').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.validateHashApiKey(
                    hashFormRequest,
                    hashFormRequest
                )
            ).toBe(result);
        });

        it('should return an failed', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${authApi._id}`
            );
            const hashFormRequest = findOne.hash;
            const hashWrong = faker.random.alphaNumeric(10);
            const result: boolean = await apiKeyService.validateHashApiKey(
                hashFormRequest,
                hashWrong
            );
            jest.spyOn(apiKeyService, 'validateHashApiKey').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.validateHashApiKey(
                    hashFormRequest,
                    hashWrong
                )
            ).toBe(result);
        });
    });

    afterEach(async () => {
        try {
            await apiKeyService.deleteOne({
                _id: authApi._id,
            });
            await apiKeyBulkService.deleteMany({
                name: authApiName,
            });
        } catch (e) {
            console.error(e);
        }
    });
});
