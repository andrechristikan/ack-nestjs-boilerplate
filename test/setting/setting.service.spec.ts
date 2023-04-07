import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HelperNumberService } from 'src/common/helper/services/helper.number.service';
import { SettingCreateDto } from 'src/common/setting/dtos/setting.create.dto';
import { SettingUpdateValueDto } from 'src/common/setting/dtos/setting.update-value.dto';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import {
    SettingDatabaseName,
    SettingDoc,
    SettingEntity,
} from 'src/common/setting/repository/entities/setting.entity';
import { SettingRepository } from 'src/common/setting/repository/repositories/setting.repository';
import { SettingService } from 'src/common/setting/services/setting.service';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { SettingSchema } from 'src/common/setting/repository/entities/setting.entity';

describe('SettingService', () => {
    let service: SettingService;
    let configService: ConfigService;
    let repository: SettingRepository;
    const settingId = faker.datatype.uuid();
    const settingEntityDoc = new mongoose.Mongoose().model(
        SettingDatabaseName,
        SettingSchema
    );

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [
                SettingService,
                {
                    provide: SettingRepository,
                    useValue: {
                        findAll: jest
                            .fn()
                            .mockResolvedValue([
                                new SettingEntity(),
                                new SettingEntity(),
                            ]),
                        findOne: jest.fn().mockImplementation(({ name }) => {
                            const find = new settingEntityDoc();
                            find._id = settingId;

                            if (name === 'maintenance') {
                                find.name = 'maintenance';
                                find.type = ENUM_SETTING_DATA_TYPE.BOOLEAN;
                                find.value = 'true';

                                return find;
                            }

                            find.name = name;

                            return find;
                        }),
                        findOneById: jest
                            .fn()
                            .mockImplementation((id: string) => {
                                const find = new settingEntityDoc();
                                find._id = id;

                                return find;
                            }),
                        getTotal: jest.fn().mockResolvedValue(1),
                        create: jest.fn().mockImplementation(() => {
                            const find = new settingEntityDoc();
                            find._id = settingId;

                            return find;
                        }),
                        save: jest.fn().mockImplementation(() => {
                            const find = new settingEntityDoc();
                            find._id = settingId;

                            return find;
                        }),
                        softDelete: jest.fn().mockImplementation(() => {
                            const find = new settingEntityDoc();
                            find._id = settingId;

                            return find;
                        }),
                        deleteMany: jest.fn().mockResolvedValue(true),
                    },
                },
                HelperNumberService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'user.mobileNumberCountryCodeAllowed':
                                    return ['62', '1'];
                                case 'auth.password.attempt':
                                    return true;
                                case 'auth.password.maxAttempt':
                                default:
                                    return 5;
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<SettingService>(SettingService);
        configService = moduleRefRef.get<ConfigService>(ConfigService);
        repository = moduleRefRef.get<SettingRepository>(SettingRepository);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should find all settings', async () => {
            const result = await service.findAll();

            expect(repository.findAll).toHaveBeenCalled();
            expect(result.length).toEqual(2);
        });
    });

    describe('findOneById', () => {
        it('should find setting by id', async () => {
            const result = await service.findOneById('id');

            expect(repository.findOneById).toHaveBeenCalled();
            expect(result).toBeInstanceOf(settingEntityDoc);
            expect(result._id).toBe('id');
        });
    });

    describe('findOneByName', () => {
        it('should find setting by name', async () => {
            const result = await service.findOneByName('setting-name');

            expect(repository.findOne).toHaveBeenCalled();
            expect(result).toBeInstanceOf(settingEntityDoc);
            expect(result.name).toBe('setting-name');
        });
    });

    describe('getTotal', () => {
        it('should get total number of settings', async () => {
            const result = await service.getTotal();

            expect(repository.getTotal).toHaveBeenCalled();
            expect(result).toBe(1);
        });
    });

    describe('create', () => {
        it('should create new setting', async () => {
            const dto: SettingCreateDto = {
                name: 'setting-name',
                value: 'setting-value',
                type: ENUM_SETTING_DATA_TYPE.STRING,
            };
            const result = await service.create(dto);

            expect(repository.create).toHaveBeenCalled();
            expect(result).toBeInstanceOf(settingEntityDoc);
            expect(result._id).toBe(settingId);
        });
    });

    describe('updateValue', () => {
        it('should update setting value', async () => {
            const dto: SettingUpdateValueDto = {
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: 'true',
            };
            const result = await service.updateValue(
                new settingEntityDoc(),
                dto
            );

            expect(repository.save).toHaveBeenCalled();
            expect(result).toBeInstanceOf(settingEntityDoc);
            expect(result._id).toBe(settingId);
        });
    });

    describe('delete', () => {
        it('should delete a setting', async () => {
            const result = await service.delete(new settingEntityDoc());

            expect(repository.softDelete).toHaveBeenCalled();
            expect(result).toBeInstanceOf(settingEntityDoc);
            expect(result._id).toBe(settingId);
        });
    });

    describe('getValue', () => {
        it('should get setting value type string', async () => {
            const setting: SettingDoc = new settingEntityDoc();
            setting._id = settingId;
            setting.type = ENUM_SETTING_DATA_TYPE.STRING;
            setting.value = 'setting-value';
            const result = await service.getValue(setting);

            expect(typeof result).toBe('string');
            expect(result).toBe('setting-value');
        });

        it('should get setting value type boolean, true', async () => {
            const setting: SettingDoc = new settingEntityDoc();
            setting._id = settingId;
            setting.type = ENUM_SETTING_DATA_TYPE.BOOLEAN;
            setting.value = 'true';
            const result = await service.getValue(setting);

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });

        it('should get setting value type boolean, false', async () => {
            const setting: SettingDoc = new settingEntityDoc();
            setting._id = settingId;
            setting.type = ENUM_SETTING_DATA_TYPE.BOOLEAN;
            setting.value = 'false';
            const result = await service.getValue(setting);

            expect(typeof result).toBe('boolean');
            expect(result).toBe(false);
        });

        it('should get setting value type number', async () => {
            const setting: SettingDoc = new settingEntityDoc();
            setting._id = settingId;
            setting.type = ENUM_SETTING_DATA_TYPE.NUMBER;
            setting.value = '11';
            const result = await service.getValue(setting);

            expect(typeof result).toBe('number');
            expect(result).toBe(11);
        });

        it('should get setting value type array of string', async () => {
            const setting: SettingDoc = new settingEntityDoc();
            setting._id = settingId;
            setting.type = ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING;
            setting.value = '11,aaa,bbb';
            const result = await service.getValue(setting);

            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['11', 'aaa', 'bbb']);
        });
    });

    describe('checkValue', () => {
        it('should get setting value type string', async () => {
            const result = await service.checkValue(
                'setting-value',
                ENUM_SETTING_DATA_TYPE.STRING
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });

        it('should get setting value type boolean, true', async () => {
            const result = await service.checkValue(
                'true',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });

        it('should get setting value type boolean, false', async () => {
            const result = await service.checkValue(
                'false',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });

        it('should return error when get setting value type boolean but value is a string', async () => {
            const result = await service.checkValue(
                'test',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(false);
        });

        it('should get setting value type number', async () => {
            const result = await service.checkValue(
                '123',
                ENUM_SETTING_DATA_TYPE.NUMBER
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });

        it('should return error when get setting value type number but value is a string', async () => {
            const result = await service.checkValue(
                'test',
                ENUM_SETTING_DATA_TYPE.NUMBER
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(false);
        });

        it('should get setting value type array of string', async () => {
            const result = await service.checkValue(
                '123,aaa,test',
                ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING
            );

            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    describe('getMaintenance', () => {
        it('should get maintenance setting value', async () => {
            const result = await service.getMaintenance();

            expect(repository.findOne).toHaveBeenCalled();
            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    describe('getMobileNumberCountryCodeAllowed', () => {
        it('should get mobile number country code allowed', async () => {
            const result = await service.getMobileNumberCountryCodeAllowed();

            expect(configService.get).toHaveBeenCalled();
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(['62', '1']);
        });
    });

    describe('getPasswordAttempt', () => {
        it('should get password attempt setting value', async () => {
            const result = await service.getPasswordAttempt();

            expect(configService.get).toHaveBeenCalled();
            expect(typeof result).toBe('boolean');
            expect(result).toBe(true);
        });
    });

    describe('getMaxPasswordAttempt', () => {
        it('should get max password attempt setting value', async () => {
            const result = await service.getMaxPasswordAttempt();

            expect(configService.get).toHaveBeenCalled();
            expect(typeof result).toBe('number');
            expect(result).toBe(5);
        });
    });

    describe('deleteMany', () => {
        it('should delete many settings', async () => {
            const result = await service.deleteMany({});

            expect(repository.deleteMany).toHaveBeenCalled();
            expect(result).toBe(true);
        });
    });
});
