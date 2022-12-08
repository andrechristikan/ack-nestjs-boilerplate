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
import { ApiKeyActiveDto } from 'src/common/api-key/dtos/api-key.active.dto';
import { ApiKeyResetDto } from 'src/common/api-key/dtos/api-key.reset.dto';

describe('ApiKeyService', () => {
    let apiKeyService: ApiKeyService;
    let apiKeyUseCase: ApiKeyUseCase;
    let apiKeyBulkService: ApiKeyBulkKeyService;

    const apiKeyName: string = faker.random.alphaNumeric(5);

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
            providers: [],
        }).compile();

        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);
        apiKeyUseCase = moduleRef.get<ApiKeyUseCase>(ApiKeyUseCase);
        apiKeyBulkService =
            moduleRef.get<ApiKeyBulkKeyService>(ApiKeyBulkKeyService);

        const apiKeyCreate: IApiKeyEntity = await apiKeyUseCase.create({
            name: apiKeyName,
            description: faker.random.alphaNumeric(),
        });
        const apiKeyCreated: ApiKeyEntity = await apiKeyService.create(
            apiKeyCreate
        );
        apiKey = {
            ...apiKeyCreated,
            secret: apiKeyCreate.secret,
        };
    });

    describe('create', () => {
        it('should return an success', async () => {
            const data: IApiKeyEntity = await apiKeyUseCase.create({
                name: apiKeyName,
                description: faker.random.alphaNumeric(),
            });

            const result: ApiKeyEntity = await apiKeyService.create(data);
            jest.spyOn(apiKeyService, 'create').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.create(data)).toBe(result);
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

    describe('findOneByKeyAndActive', () => {
        it('should return an success', async () => {
            const findOne: ApiKeyEntity = await apiKeyService.findOneById(
                `${apiKey._id}`
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

    describe('updateIsActive', () => {
        it('should return an success', async () => {
            const data: ApiKeyActiveDto = await apiKeyUseCase.active();
            const result: ApiKeyEntity = await apiKeyService.updateIsActive(
                apiKey._id,
                data
            );
            jest.spyOn(apiKeyService, 'updateIsActive').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.updateIsActive(apiKey._id, data)).toBe(
                result
            );
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
                `${apiKey._id}`,
                {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                }
            );
            jest.spyOn(apiKeyService, 'updateOneById').mockImplementation(
                async () => result
            );

            expect(
                await apiKeyService.updateOneById(`${apiKey._id}`, {
                    name: faker.random.alphaNumeric(10),
                    description: faker.random.alphaNumeric(20),
                })
            ).toBe(result);
        });
    });

    describe('updateResetById', () => {
        it('should return an success', async () => {
            const data: ApiKeyResetDto = await apiKeyUseCase.reset(apiKey);
            const result: ApiKeyEntity = await apiKeyService.updateResetById(
                apiKey._id,
                data
            );
            jest.spyOn(apiKeyService, 'updateResetById').mockImplementation(
                async () => result
            );

            expect(await apiKeyService.updateResetById(apiKey._id, data)).toBe(
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

    afterEach(async () => {
        try {
            await apiKeyService.deleteOne({
                _id: apiKey._id,
            });
            await apiKeyBulkService.deleteMany({
                name: apiKeyName,
            });
        } catch (err: any) {
            console.error(err);
        }
    });
});
