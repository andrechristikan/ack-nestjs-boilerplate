import { faker } from '@faker-js/faker';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import mongoose from 'mongoose';
import { DatabaseQueryContain } from 'src/common/database/decorators/database.decorator';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/enums/pagination.enum';
import { CountryCreateRequestDto } from 'src/modules/country/dtos/request/country.create.request.dto';
import { CountryGetResponseDto } from 'src/modules/country/dtos/response/country.get.response.dto';
import { CountryListResponseDto } from 'src/modules/country/dtos/response/country.list.response.dto';
import { CountryShortResponseDto } from 'src/modules/country/dtos/response/country.short.response.dto';
import {
    CountryDoc,
    CountryEntity,
    CountrySchema,
} from 'src/modules/country/repository/entities/country.entity';
import { CountryRepository } from 'src/modules/country/repository/repositories/country.repository';
import { CountryService } from 'src/modules/country/services/country.service';
describe('CountryService', () => {
    let service: CountryService;

    const countryId = faker.string.uuid();

    const countryEntity: CountryEntity = {
        _id: countryId,
        name: 'Indonesia',
        alpha2Code: 'ID',
        alpha3Code: 'IDN',
        domain: 'id',
        fipsCode: 'ID',
        numericCode: '360',
        phoneCode: ['62'],
        continent: 'Asia',
        timeZone: 'Asia/Jakarta',
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        deleted: false,
    } as CountryEntity;

    const countryDoc: CountryDoc = {
        ...countryEntity,
        save: jest.fn() as unknown,
        toObject: jest.fn().mockReturnValue(countryEntity) as unknown,
        toJSON: jest.fn().mockReturnValue(countryEntity) as unknown,
    } as CountryDoc;

    const countryOtherEntity: CountryEntity = {
        _id: faker.string.uuid(),
        name: 'Singapore',
        alpha2Code: 'SG',
        alpha3Code: 'SGD',
        domain: 'sg',
        fipsCode: 'SG',
        numericCode: '360',
        phoneCode: ['62'],
        continent: 'Asia',
        timeZone: 'Asia/Singapore',
        createdAt: faker.date.recent(),
        updatedAt: faker.date.recent(),
        deleted: false,
    } as CountryEntity;

    const countryOtherDoc: CountryDoc = {
        ...countryOtherEntity,
        save: jest.fn() as unknown,
        toObject: jest.fn().mockReturnValue(countryOtherEntity) as unknown,
        toJSON: jest.fn().mockReturnValue(countryOtherEntity) as unknown,
    } as CountryDoc;

    const countriesEntity: CountryEntity[] = [
        countryEntity,
        countryOtherEntity,
    ];
    const countriesDoc: CountryDoc[] = [countryDoc, countryOtherDoc];

    const mockCountryRepository = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        findOneById: jest.fn(),
        getTotal: jest.fn(),
        softDelete: jest.fn(),
        deleteMany: jest.fn(),
        createMany: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CountryService,
                { provide: CountryRepository, useValue: mockCountryRepository },
            ],
        }).compile();

        service = module.get<CountryService>(CountryService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return the data', async () => {
            mockCountryRepository.findAll.mockReturnValue(countriesDoc);
            const result = await service.findAll({});
            expect(mockCountryRepository.findAll).toHaveBeenCalledWith(
                {},
                undefined
            );
            expect(result.length).toEqual(2);
            expect(result).toEqual(countriesDoc);
        });

        it('should return the data with options', async () => {
            mockCountryRepository.findAll.mockReturnValue([countryDoc]);
            const result = await service.findAll(
                {},
                {
                    paging: {
                        limit: 1,
                        offset: 0,
                    },
                    select: {
                        _id: true,
                    },
                    order: {
                        _id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    },
                }
            );
            expect(mockCountryRepository.findAll).toHaveBeenCalledWith(
                {},
                {
                    paging: {
                        limit: 1,
                        offset: 0,
                    },
                    select: {
                        _id: true,
                    },
                    order: {
                        _id: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC,
                    },
                }
            );
            expect(result.length).toEqual(1);
        });
    });

    describe('findOne', () => {
        it('should find one a country by alpha3Code', async () => {
            mockCountryRepository.findOne.mockImplementation((query: any) =>
                countriesDoc.find(e => e.alpha3Code === query.alpha3Code)
            );

            const result = await service.findOne({
                alpha3Code: 'IDN',
            });

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    alpha3Code: 'IDN',
                },
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a country by alpha3Code with options select', async () => {
            mockCountryRepository.findOne.mockImplementation((query: any) =>
                countriesDoc.find(e => e.alpha3Code === query.alpha3Code)
            );

            const result = await service.findOne(
                {
                    alpha3Code: 'IDN',
                },
                {
                    select: {
                        _id: true,
                    },
                }
            );

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    alpha3Code: 'IDN',
                },
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('findOneByName', () => {
        it('should find one a country by name', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneByName('Indonesia');

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                DatabaseQueryContain('name', 'Indonesia'),
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a country by name with options select', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneByName('Indonesia', {
                select: {
                    _id: true,
                },
            });

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                DatabaseQueryContain('name', 'Indonesia'),
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('findOneByAlpha2', () => {
        it('should find one a country by alpha2', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneByAlpha2('ID');

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                DatabaseQueryContain('alpha2Code', 'ID'),
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a country by alpha2 with options select', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneByAlpha2('ID', {
                select: {
                    _id: true,
                },
            });

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                DatabaseQueryContain('alpha2Code', 'ID'),
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('findOneActiveByPhoneCode', () => {
        it('should find one a active country by phone number', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneActiveByPhoneCode('62');

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    phoneCode: '62',
                    isActive: true,
                },
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a active country by phone number with options select', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneActiveByPhoneCode('62', {
                select: {
                    _id: true,
                },
            });

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    phoneCode: '62',
                    isActive: true,
                },
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('findOneById', () => {
        it('should find one a country by id', async () => {
            mockCountryRepository.findOneById.mockReturnValue(countryDoc);

            const result = await service.findOneById(countryId);

            expect(mockCountryRepository.findOneById).toHaveBeenCalledWith(
                countryId,
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a country by id with options select', async () => {
            mockCountryRepository.findOneById.mockReturnValue(countryDoc);

            const result = await service.findOneById(countryId, {
                select: {
                    _id: true,
                },
            });

            expect(mockCountryRepository.findOneById).toHaveBeenCalledWith(
                countryId,
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('findOneActiveById', () => {
        it('should find one a active country by id', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneActiveById(countryId);

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    _id: countryId,
                    isActive: true,
                },
                undefined
            );
            expect(result).toEqual(countryDoc);
        });

        it('should find one a active country by id with options select', async () => {
            mockCountryRepository.findOne.mockReturnValue(countryDoc);

            const result = await service.findOneActiveById(countryId, {
                select: {
                    _id: true,
                },
            });

            expect(mockCountryRepository.findOne).toHaveBeenCalledWith(
                {
                    _id: countryId,
                    isActive: true,
                },
                {
                    select: {
                        _id: true,
                    },
                }
            );
            expect(result).toEqual(countryDoc);
        });
    });

    describe('getTotal', () => {
        it('should get total number of countries', async () => {
            mockCountryRepository.getTotal.mockImplementation(
                () => countriesDoc.length
            );

            const result = await service.getTotal({});

            expect(mockCountryRepository.getTotal).toHaveBeenCalledWith(
                {},
                undefined
            );
            expect(typeof result).toBe('number');
            expect(result).toBe(countriesDoc.length);
        });

        it('should get total number of countries with options', async () => {
            mockCountryRepository.getTotal.mockImplementation(
                () => countriesDoc.length
            );

            const result = await service.getTotal(
                {},
                {
                    withDeleted: true,
                }
            );

            expect(mockCountryRepository.getTotal).toHaveBeenCalledWith(
                {},
                {
                    withDeleted: true,
                }
            );
            expect(typeof result).toBe('number');
            expect(result).toBe(countriesDoc.length);
        });
    });

    describe('createMany', () => {
        it('should create many country', async () => {
            const dto: CountryCreateRequestDto[] = [
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
            ];
            const entity = dto.map(
                ({
                    name,
                    alpha2Code,
                    alpha3Code,
                    numericCode,
                    continent,
                    fipsCode,
                    phoneCode,
                    timeZone,
                    domain,
                }): CountryCreateRequestDto => {
                    const create: CountryEntity = new CountryEntity();
                    create.name = name;
                    create.alpha2Code = alpha2Code;
                    create.alpha3Code = alpha3Code;
                    create.numericCode = numericCode;
                    create.continent = continent;
                    create.fipsCode = fipsCode;
                    create.phoneCode = phoneCode;
                    create.timeZone = timeZone;
                    create.domain = domain;

                    return create;
                }
            );

            mockCountryRepository.createMany.mockResolvedValue(true);

            const result = await service.createMany(dto);

            expect(mockCountryRepository.createMany).toHaveBeenCalledWith(
                entity,
                undefined
            );
            expect(result).toBe(true);
        });

        it('should create many country', async () => {
            const dto: CountryCreateRequestDto[] = [
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
            ];
            const entity = dto.map(
                ({
                    name,
                    alpha2Code,
                    alpha3Code,
                    numericCode,
                    continent,
                    fipsCode,
                    phoneCode,
                    timeZone,
                    domain,
                }): CountryCreateRequestDto => {
                    const create: CountryEntity = new CountryEntity();
                    create.name = name;
                    create.alpha2Code = alpha2Code;
                    create.alpha3Code = alpha3Code;
                    create.numericCode = numericCode;
                    create.continent = continent;
                    create.fipsCode = fipsCode;
                    create.phoneCode = phoneCode;
                    create.timeZone = timeZone;
                    create.domain = domain;

                    return create;
                }
            );

            mockCountryRepository.createMany.mockResolvedValue(true);

            const session: any = jest.fn();
            const result = await service.createMany(dto, { session });

            expect(mockCountryRepository.createMany).toHaveBeenCalledWith(
                entity,
                {
                    session,
                }
            );
            expect(result).toBe(true);
        });

        it('should throw an error', async () => {
            const dto: CountryCreateRequestDto[] = [
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
                {
                    name: faker.location.country(),
                    alpha2Code: faker.location.countryCode(),
                    alpha3Code: faker.location.countryCode(),
                    numericCode: faker.location.countryCode(),
                    continent: faker.location.county(),
                    fipsCode: faker.location.countryCode(),
                    phoneCode: ['62'],
                    timeZone: faker.lorem.word(),
                    domain: faker.internet.domainSuffix(),
                },
            ];
            mockCountryRepository.createMany.mockRejectedValue(
                new Error('test error')
            );

            try {
                await service.createMany(dto);
            } catch (err: any) {
                expect(err).toBeInstanceOf(Error);
                expect(err).toEqual(new Error('test error'));
            }
        });
    });

    describe('deleteMany', () => {
        it('should delete many countries', async () => {
            mockCountryRepository.deleteMany.mockResolvedValue(true);

            const result = await service.deleteMany({});

            expect(mockCountryRepository.deleteMany).toHaveBeenCalledWith(
                {},
                undefined
            );
            expect(result).toBe(true);
        });

        it('should delete many countries with options', async () => {
            mockCountryRepository.deleteMany.mockResolvedValue(true);

            const session: any = jest.fn();
            const result = await service.deleteMany({}, { session });

            expect(mockCountryRepository.deleteMany).toHaveBeenCalledWith(
                {},
                { session }
            );
            expect(result).toBe(true);
        });

        it('should throw an error', async () => {
            mockCountryRepository.deleteMany.mockRejectedValue(
                new Error('test error')
            );

            const session: any = jest.fn();

            try {
                await service.deleteMany({}, { session });
            } catch (err: any) {
                expect(err).toBeInstanceOf(Error);
                expect(err).toEqual(new Error('test error'));
            }
        });
    });

    describe('mapList', () => {
        it('should map list docs to response dto', async () => {
            const CountryDocTest = mongoose.model('test', CountrySchema);
            const docsTest = countriesEntity.map(e => new CountryDocTest(e));
            const result = await service.mapList(docsTest);
            const mapped = plainToInstance(
                CountryListResponseDto,
                countriesEntity
            );

            expect(result).toEqual(mapped);
        });

        it('should map list entities to response dto', async () => {
            const result = await service.mapList(countriesEntity);
            const mapped = plainToInstance(
                CountryListResponseDto,
                countriesEntity
            );

            expect(result).toEqual(mapped);
        });
    });

    describe('mapGet', () => {
        it('should map one docs to response dto', async () => {
            const CountryDocTest = mongoose.model('test', CountrySchema);
            const docTest = new CountryDocTest(countryEntity);
            const result = await service.mapGet(docTest);
            const mapped = plainToInstance(
                CountryGetResponseDto,
                countryEntity
            );

            expect(result).toEqual(mapped);
        });

        it('should map one entities to response dto', async () => {
            const result = await service.mapGet(countryEntity);
            const mapped = plainToInstance(
                CountryGetResponseDto,
                countryEntity
            );

            expect(result).toEqual(mapped);
        });
    });

    describe('mapShort', () => {
        it('should map list docs to response dto', async () => {
            const CountryDocTest = mongoose.model('test', CountrySchema);
            const docsTest = countriesEntity.map(e => new CountryDocTest(e));
            const result = await service.mapShort(docsTest);
            const mapped = plainToInstance(
                CountryShortResponseDto,
                countriesEntity
            );

            expect(result).toEqual(mapped);
        });

        it('should map list entities to response dto', async () => {
            const result = await service.mapShort(countriesEntity);
            const mapped = plainToInstance(
                CountryShortResponseDto,
                countriesEntity
            );

            expect(result).toEqual(mapped);
        });
    });
});
