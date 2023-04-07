import { Test, TestingModule } from '@nestjs/testing';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ApiKeyRepository } from 'src/common/api-key/repository/repositories/api-key.repository';
import {
    ApiKeyDatabaseName,
    ApiKeyEntity,
    ApiKeySchema,
} from 'src/common/api-key/repository/entities/api-key.entity';
import { ConfigService } from '@nestjs/config';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import {
    ApiKeyCreateByUserDto,
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyUpdateDto } from 'src/common/api-key/dtos/api-key.update.dto';
import { ApiKeyUpdateDateDto } from 'src/common/api-key/dtos/api-key.update-date.dto';

describe('ApiKeyService', () => {
    let service: ApiKeyService;
    let repository: ApiKeyRepository;
    const apiKeyId = faker.datatype.uuid();
    const userId = faker.datatype.uuid();
    const apiKeyEntityDoc = new mongoose.Mongoose().model(
        ApiKeyDatabaseName,
        ApiKeySchema
    );

    beforeEach(async () => {
        const moduleRefRef: TestingModule = await Test.createTestingModule({
            providers: [
                ApiKeyService,
                HelperDateService,
                HelperStringService,
                HelperHashService,
                {
                    provide: ApiKeyRepository,
                    useValue: {
                        findAll: jest
                            .fn()
                            .mockResolvedValue([
                                new ApiKeyEntity(),
                                new ApiKeyEntity(),
                            ]),
                        findOneById: jest
                            .fn()
                            .mockImplementation((id: string) => {
                                const find = new apiKeyEntityDoc();
                                find._id = id;
                                find.user = userId;

                                return find;
                            }),
                        findOne: jest.fn().mockImplementation(({ key }) => {
                            const find = new apiKeyEntityDoc();
                            find._id = apiKeyId;
                            find.user = userId;

                            if (key) {
                                find.key = key;
                            }

                            return find;
                        }),
                        getTotal: jest.fn().mockResolvedValue(1),
                        exists: jest.fn().mockResolvedValue(true),
                        create: jest
                            .fn()
                            .mockImplementation(
                                ({ name, key, startDate, endDate }) => {
                                    const find = new apiKeyEntityDoc();
                                    find._id = apiKeyId;
                                    find.user = userId;
                                    find.name = name;
                                    find.key = key;
                                    find.startDate = startDate
                                        ? new Date(startDate)
                                        : undefined;
                                    find.endDate = endDate
                                        ? new Date(endDate)
                                        : undefined;

                                    return find;
                                }
                            ),
                        save: jest
                            .fn()
                            .mockImplementation(
                                ({
                                    name,
                                    key,
                                    startDate,
                                    endDate,
                                    isActive,
                                }) => {
                                    const find = new apiKeyEntityDoc();
                                    find._id = apiKeyId;
                                    find.user = userId;
                                    find.name = name;
                                    find.key = key;
                                    find.isActive = isActive;
                                    find.startDate = startDate
                                        ? new Date(startDate)
                                        : undefined;
                                    find.endDate = endDate
                                        ? new Date(endDate)
                                        : undefined;

                                    return find;
                                }
                            ),
                        softDelete: jest.fn().mockImplementation(() => {
                            const find = new apiKeyEntityDoc();
                            find._id = apiKeyId;
                            find.user = userId;

                            return find;
                        }),
                        deleteMany: jest.fn().mockResolvedValue(true),
                        updateMany: jest.fn().mockResolvedValue(true),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'app.env':
                                default:
                                    return 'envMock';
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<ApiKeyService>(ApiKeyService);
        repository = moduleRefRef.get<ApiKeyRepository>(ApiKeyRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should find all apiKeys', async () => {
            const result = await service.findAll();

            expect(repository.findAll).toHaveBeenCalled();
            expect(result.length).toEqual(2);
        });
    });

    describe('findOneById', () => {
        it('should find apiKey by id', async () => {
            const result = await service.findOneById('id');

            expect(repository.findOneById).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe('id');
        });
    });

    describe('findOne', () => {
        it('should find apiKey', async () => {
            const result = await service.findOne({});

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
        });
    });

    describe('findOneByKey', () => {
        it('should find apiKey by key', async () => {
            const result = await service.findOneByKey('apiKey-key');

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.key).toBe('apiKey-key');
        });
    });

    describe('findOneByActiveKey', () => {
        it('should find apiKey by active key', async () => {
            const result = await service.findOneByActiveKey('apiKey-key');

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.key).toBe('apiKey-key');
        });
    });

    describe('findAllByUser', () => {
        it('should find all apiKeys by user', async () => {
            const result = await service.findAllByUser(userId);

            expect(repository.findAll).toHaveBeenCalled();
            expect(result.length).toEqual(2);
        });
    });

    describe('findOneByIdAndUser', () => {
        it('should find apiKey by id and user', async () => {
            const result = await service.findOneByIdAndUser(userId, apiKeyId);

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.user).toBe(userId);
        });
    });

    describe('findOneByUser', () => {
        it('should find apiKey by user', async () => {
            const result = await service.findOneByUser(userId, {});

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.user).toBe(userId);
        });
    });

    describe('findOneByKeyAndUser', () => {
        it('should find apiKey by key and user', async () => {
            const result = await service.findOneByKeyAndUser(
                userId,
                'apiKey-key'
            );

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.user).toBe(userId);
            expect(result.key).toBe('apiKey-key');
        });
    });

    describe('findOneByActiveKeyAndUser', () => {
        it('should find apiKey by active key and user', async () => {
            const result = await service.findOneByActiveKeyAndUser(
                userId,
                'apiKey-key'
            );

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.user).toBe(userId);
            expect(result.key).toBe('apiKey-key');
        });
    });

    describe('existByUser', () => {
        it('should return boolean value of exist data', async () => {
            const result = await service.existByUser(userId);

            expect(repository.exists).toHaveBeenCalled();
            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    describe('getTotal', () => {
        it('should get total number of apiKeys', async () => {
            const result = await service.getTotal();

            expect(repository.getTotal).toHaveBeenCalled();
            expect(typeof result).toBe('number');
            expect(result).toBe(1);
        });
    });

    describe('getTotalByUser', () => {
        it('should get total number of apiKeys', async () => {
            const result = await service.getTotalByUser(userId);

            expect(repository.getTotal).toHaveBeenCalled();
            expect(typeof result).toBe('number');
            expect(result).toBe(1);
        });
    });

    describe('create', () => {
        it('should create new apiKey', async () => {
            const dto: ApiKeyCreateDto = {
                name: 'apiKey-name',
                user: userId,
            };
            const result = await service.create(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
        });

        it('should create new apiKey within start date and end date', async () => {
            const startDate = new Date('2022-12-01T00:00:00.000Z');
            const endDate = new Date('2023-12-01T00:00:00.000Z');
            const dto: ApiKeyCreateDto = {
                name: 'apiKey-name',
                user: userId,
                endDate: endDate,
                startDate: startDate,
            };
            const result = await service.create(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
            expect(result.doc.startDate.getTime()).toEqual(
                new Date(startDate.setHours(0, 0, 0, 0)).getTime()
            );
            expect(result.doc.endDate.getTime()).toEqual(
                new Date(endDate.setHours(23, 59, 59, 999)).getTime()
            );
        });
    });

    describe('createByUser', () => {
        it('should create new apiKey by user', async () => {
            const dto: ApiKeyCreateByUserDto = {
                name: 'apiKey-name',
            };
            const result = await service.createByUser(userId, dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
        });

        it('should create new apiKey within start date and end date', async () => {
            const startDate = new Date('2022-12-01T00:00:00.000Z');
            const endDate = new Date('2023-12-01T00:00:00.000Z');
            const dto: ApiKeyCreateByUserDto = {
                name: 'apiKey-name',
                endDate: endDate,
                startDate: startDate,
            };
            const result = await service.createByUser(userId, dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
            expect(result.doc.startDate.getTime()).toEqual(
                new Date(startDate.setHours(0, 0, 0, 0)).getTime()
            );
            expect(result.doc.endDate.getTime()).toEqual(
                new Date(endDate.setHours(23, 59, 59, 999)).getTime()
            );
        });
    });

    describe('createRaw', () => {
        it('should create new apiKey', async () => {
            const dto: ApiKeyCreateRawDto = {
                name: 'apiKey-name',
                user: userId,
                secret: 'secretApiKey',
                key: 'apiKey_1',
            };
            const result = await service.createRaw(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
            expect(result.doc.key).toBe('apiKey_1');
        });

        it('should create new apiKey within start date and end date', async () => {
            const startDate = new Date('2022-12-01T00:00:00.000Z');
            const endDate = new Date('2023-12-01T00:00:00.000Z');
            const dto: ApiKeyCreateRawDto = {
                name: 'apiKey-name',
                user: userId,
                secret: 'secretApiKey',
                key: 'apiKey_1',
                endDate: endDate,
                startDate: startDate,
            };
            const result = await service.createRaw(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result.secret).toBeDefined();
            expect(result.doc).toBeInstanceOf(apiKeyEntityDoc);
            expect(result.doc._id).toBe(apiKeyId);
            expect(result.doc.name).toBe('apikey-name');
            expect(result.doc.key).toBe('apiKey_1');
            expect(result.doc.startDate.getTime()).toEqual(
                new Date(startDate.setHours(0, 0, 0, 0)).getTime()
            );
            expect(result.doc.endDate.getTime()).toEqual(
                new Date(endDate.setHours(23, 59, 59, 999)).getTime()
            );
        });
    });

    describe('active', () => {
        it('should update apiKey active', async () => {
            const result = await service.active(new apiKeyEntityDoc());

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.isActive).toBe(true);
        });
    });

    describe('inactive', () => {
        it('should update apiKey inactive', async () => {
            const result = await service.inactive(new apiKeyEntityDoc());

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.isActive).toBe(false);
        });
    });

    describe('update', () => {
        it('should update apiKey value', async () => {
            const dto: ApiKeyUpdateDto = {
                name: 'apiKey-name123',
            };
            const result = await service.update(new apiKeyEntityDoc(), dto);

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.name).toBe('apikey-name123');
        });
    });

    describe('updateDate', () => {
        it('should update apiKey start date and end date', async () => {
            const startDate = new Date('2022-12-01T00:00:00.000Z');
            const endDate = new Date('2023-12-01T00:00:00.000Z');
            const dto: ApiKeyUpdateDateDto = {
                endDate: endDate,
                startDate: startDate,
            };
            const result = await service.updateDate(new apiKeyEntityDoc(), dto);

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
            expect(result.startDate.getTime()).toEqual(
                new Date(startDate.setHours(0, 0, 0, 0)).getTime()
            );
            expect(result.endDate.getTime()).toEqual(
                new Date(endDate.setHours(23, 59, 59, 999)).getTime()
            );
        });
    });

    describe('reset', () => {
        it('should update apiKey reset secret', async () => {
            const secret = 'apiKey_secret';
            const result = await service.reset(new apiKeyEntityDoc(), secret);

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
        });
    });

    describe('delete', () => {
        it('should delete a apiKey', async () => {
            const result = await service.delete(new apiKeyEntityDoc());

            expect(repository.softDelete).toHaveBeenCalled();
            expect(result).toBeInstanceOf(apiKeyEntityDoc);
            expect(result._id).toBe(apiKeyId);
        });
    });

    describe('validateHashApiKey', () => {
        it('should return boolean from validate hash api key', async () => {
            const result = await service.validateHashApiKey(
                'SGVsbG8gV29ybGQh',
                'SGVsbG8gV29ybGQh'
            );

            expect(result).toBeDefined();
            expect(typeof result).toBe('boolean');
        });
    });

    describe('createKey', () => {
        it('should return string of api key', async () => {
            const result = await service.createKey();

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('createSecret', () => {
        it('should return string of secret api key', async () => {
            const result = await service.createSecret();

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('createHashApiKey', () => {
        it('should return string of api key hash', async () => {
            const result = await service.createHashApiKey(
                'SGVsbG8gV29ybGQh',
                'SGVsbG8gV29ybGQh'
            );

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
        });
    });

    describe('deleteMany', () => {
        it('should delete many apiKeys', async () => {
            const result = await service.deleteMany({});

            expect(repository.deleteMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });

    describe('inactiveManyByEndDate', () => {
        it('should update many apiKeys', async () => {
            const result = await service.inactiveManyByEndDate({});

            expect(repository.updateMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
