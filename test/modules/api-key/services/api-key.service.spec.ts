import { faker } from '@faker-js/faker';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import mongoose from 'mongoose';
import {
    ApiKeyCreateRawRequestDto,
    ApiKeyCreateRequestDto,
} from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyGetResponseDto } from 'src/modules/api-key/dtos/response/api-key.get.response.dto';
import { ApiKeyListResponseDto } from 'src/modules/api-key/dtos/response/api-key.list.response.dto';
import {
    ApiKeyDoc,
    ApiKeyEntity,
    ApiKeySchema,
} from 'src/modules/api-key/repository/entities/api-key.entity';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';

const mockHelperStringService = {
    random: jest.fn(),
};

const mockConfigService = {
    get: jest.fn(),
};

const mockHelperHashService = {
    sha256: jest.fn(),
    sha256Compare: jest.fn(),
};

const mockHelperDateService = {
    startOfDay: jest.fn(),
    endOfDay: jest.fn(),
    create: jest.fn(),
};

const mockApiKeyRepository = {
    findAll: jest.fn(),
    findOneById: jest.fn(),
    findOne: jest.fn(),
    getTotal: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
};

describe('ApiKeyService', () => {
    let service: ApiKeyService;
    let configService: ConfigService;
    let apiKeyRepository: ApiKeyRepository;
    let helperHashService: HelperHashService;
    let helperStringService: HelperStringService;

    let findAllOpts: IDatabaseFindAllOptions;
    let findOneOpts: IDatabaseOptions;
    let createOpts: IDatabaseCreateOptions;
    let saveOpts: IDatabaseSaveOptions;
    let deleteManyOpts: IDatabaseDeleteManyOptions;
    let updateManyOpts: IDatabaseUpdateManyOptions;
    let apiKeyDoc: ApiKeyDoc;
    let find: Record<string, any>;
    let id: string;
    let key: string;
    let apiKeyCreateRequestDto: ApiKeyCreateRequestDto;
    let apiKeyCreateRawRequestDto: ApiKeyCreateRawRequestDto;

    const entity: ApiKeyEntity = {
        _id: faker.string.uuid(),
        name: faker.person.jobTitle(),
        type: ENUM_API_KEY_TYPE.DEFAULT,
        key: faker.string.alpha(15),
        hash: faker.string.alpha(20),
        isActive: true,
        startDate: faker.date.past(),
        endDate: faker.date.future(),
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        deletedAt: faker.date.recent(),
        deleted: false,
    };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                ApiKeyService,
                {
                    provide: HelperStringService,
                    useValue: mockHelperStringService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
                {
                    provide: HelperHashService,
                    useValue: mockHelperHashService,
                },
                {
                    provide: HelperDateService,
                    useValue: mockHelperDateService,
                },
                {
                    provide: ApiKeyRepository,
                    useValue: mockApiKeyRepository,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = moduleRef.get<ApiKeyService>(ApiKeyService);
        configService = moduleRef.get<ConfigService>(ConfigService);
        apiKeyRepository = moduleRef.get<ApiKeyRepository>(ApiKeyRepository);
        helperHashService = moduleRef.get<HelperHashService>(HelperHashService);
        helperStringService =
            moduleRef.get<HelperStringService>(HelperStringService);
        helperStringService =
            moduleRef.get<HelperStringService>(HelperStringService);

        (configService.get as jest.Mock).mockReturnValueOnce('get');

        findAllOpts = {
            order: {},
            paging: {
                limit: 1,
                offset: 0,
            },
        };
        findOneOpts = {};
        createOpts = {};
        saveOpts = {};
        deleteManyOpts = {};
        updateManyOpts = {};
        apiKeyDoc = {} as ApiKeyDoc;
        // apiKeyEntity = ;
        find = {};
        id = 'id';
        // key = ;
        apiKeyCreateRequestDto = {
            name: 'name',
            type: ENUM_API_KEY_TYPE.SYSTEM,
            endDate: new Date(),
            startDate: new Date(),
        };
        apiKeyCreateRawRequestDto = {
            name: 'name',
            type: ENUM_API_KEY_TYPE.SYSTEM,
            endDate: new Date(),
            startDate: new Date(),
            key: 'key',
            secret: 'secret',
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return found records', async () => {
            (apiKeyRepository.findAll as jest.Mock).mockReturnValue([]);
            expect(await service.findAll(find, findAllOpts)).toEqual([]);
        });
    });

    describe('findOneById', () => {
        it('should return record by id', async () => {
            (apiKeyRepository.findOneById as jest.Mock).mockReturnValue({});
            expect(await service.findOneById(id, findOneOpts)).toEqual({});
        });
    });

    describe('findOne', () => {
        it('should return one record', async () => {
            (apiKeyRepository.findOne as jest.Mock).mockReturnValue({});
            expect(await service.findOne(find, findOneOpts)).toEqual({});
        });
    });

    describe('findOneByKey', () => {
        it('should return one record', async () => {
            (apiKeyRepository.findOne as jest.Mock).mockReturnValue({});
            expect(await service.findOneByKey(key, findOneOpts)).toEqual({});
        });
    });

    describe('findOneByActiveKey', () => {
        it('should return one active record', async () => {
            (apiKeyRepository.findOne as jest.Mock).mockReturnValue({});
            expect(await service.findOneByActiveKey(key, findOneOpts)).toEqual(
                {}
            );
        });
    });

    describe('getTotal', () => {
        it('should return total', async () => {
            (apiKeyRepository.getTotal as jest.Mock).mockReturnValue(1);
            expect(await service.getTotal(find, findOneOpts)).toEqual(1);
        });
    });

    describe('create', () => {
        it('should success create', async () => {
            (apiKeyRepository.create as jest.Mock).mockReturnValue({});
            expect(
                await service.create(apiKeyCreateRequestDto, createOpts)
            ).toEqual({});
        });
    });

    describe('createRaw', () => {
        it('should success create raw', async () => {
            (apiKeyRepository.create as jest.Mock).mockReturnValue({
                _id: 1,
                key: 'key',
            });
            expect(
                await service.createRaw(apiKeyCreateRawRequestDto, createOpts)
            ).toEqual({
                _id: 1,
                key: 'key',
                secret: 'secret',
            });
        });
    });

    describe('active', () => {
        it('should set active true', async () => {
            (apiKeyRepository.save as jest.Mock).mockReturnValue({});
            expect(await service.active(apiKeyDoc, saveOpts)).toEqual({});
        });
    });

    describe('inactive', () => {
        it('should set inactive', async () => {
            (apiKeyRepository.save as jest.Mock).mockReturnValue({});
            expect(await service.inactive(apiKeyDoc, saveOpts)).toEqual({});
        });
    });

    describe('update', () => {
        it('should update successfully', async () => {
            (apiKeyRepository.save as jest.Mock).mockReturnValue({});
            expect(
                await service.update(apiKeyDoc, { name: 'name' }, saveOpts)
            ).toEqual({});
        });
    });

    describe('updateDate', () => {
        it('should update Date successfully', async () => {
            (apiKeyRepository.save as jest.Mock).mockReturnValue({});
            expect(
                await service.updateDate(
                    apiKeyDoc,
                    { startDate: new Date(), endDate: new Date() },
                    saveOpts
                )
            ).toEqual({});
        });
    });

    describe('reset', () => {
        it('should reset successfully', async () => {
            (apiKeyRepository.save as jest.Mock).mockReturnValue({
                _id: 'id',
                key: 'key',
            });
            expect(await service.reset(apiKeyDoc, saveOpts)).toEqual({
                _id: 'id',
                key: 'key',
            });
        });
    });

    describe('delete', () => {
        it('should soft delete', async () => {
            (apiKeyRepository.softDelete as jest.Mock).mockReturnValueOnce({});
            expect(await service.delete(apiKeyDoc, saveOpts)).toEqual({});
        });
    });

    describe('validateHashApiKey', () => {
        it('should validate hash api key', async () => {
            (helperHashService.sha256Compare as jest.Mock).mockReturnValueOnce(
                true
            );
            expect(await service.validateHashApiKey('', '')).toEqual(true);
        });
    });

    describe('createKey', () => {
        it('should create key', async () => {
            (helperStringService.random as jest.Mock).mockReturnValueOnce(
                'random'
            );
            expect(await service.createKey()).toEqual('get_random');
        });
    });

    describe('deleteMany', () => {
        it('should delete many', async () => {
            (apiKeyRepository.deleteMany as jest.Mock).mockReturnValueOnce(
                true
            );
            expect(await service.deleteMany(find, deleteManyOpts)).toEqual(
                true
            );
        });

        it('should throw an error if there repository error', async () => {
            (apiKeyRepository.deleteMany as jest.Mock).mockRejectedValue(
                new Error('repository error')
            );
            expect(service.deleteMany(find, deleteManyOpts)).rejects.toThrow(
                new Error('repository error')
            );
        });
    });

    describe('inactiveManyByEndDate', () => {
        it('should be inactive by end date', async () => {
            (apiKeyRepository.updateMany as jest.Mock).mockReturnValueOnce(
                true
            );
            expect(await service.inactiveManyByEndDate(updateManyOpts)).toEqual(
                true
            );
        });

        it('should throw an error if there repository error', async () => {
            (apiKeyRepository.updateMany as jest.Mock).mockRejectedValue(
                new Error('repository error')
            );
            expect(
                service.inactiveManyByEndDate(updateManyOpts)
            ).rejects.toThrow(new Error('repository error'));
        });
    });

    describe('mapList', () => {
        it('should map list docs to apikey dto', async () => {
            const ApiDocTest = mongoose.model('test', ApiKeySchema);
            const docsTest = [entity].map(e => new ApiDocTest(e));
            const result = await service.mapList(docsTest);
            const mapped = plainToInstance(ApiKeyListResponseDto, [entity]);

            expect(result).toEqual(mapped);
        });

        it('should map list entities to apikey dto', async () => {
            const result = await service.mapList([entity]);
            const mapped = plainToInstance(ApiKeyListResponseDto, [entity]);

            expect(result).toEqual(mapped);
        });
    });

    describe('mapGet', () => {
        it('should map get doc to apikey dto', async () => {
            const ApiDocTest = mongoose.model('test', ApiKeySchema);
            const docTest = new ApiDocTest(entity);
            const result = await service.mapGet(docTest);
            const mapped = plainToInstance(ApiKeyGetResponseDto, entity);

            expect(result).toEqual(mapped);
        });

        it('should map get entity to apikey dto', async () => {
            const result = await service.mapGet(entity);
            const mapped = plainToInstance(ApiKeyGetResponseDto, entity);

            expect(result).toEqual(mapped);
        });
    });
});
