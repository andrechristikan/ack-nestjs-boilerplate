import { faker } from '@faker-js/faker';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import {
    SettingDoc,
    SettingEntity,
} from 'src/common/setting/repository/entities/setting.entity';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingModule } from 'src/common/setting/setting.module';
import configs from 'src/configs';

describe('SettingService', () => {
    let settingService: SettingService;
    let setting: SettingDoc;
    const settingName1 = `${faker.name.jobArea()}${+new Date()}`;
    const settingName2 = `${faker.name.jobArea()}${+new Date()}`;
    const settingName3 = `${faker.name.jobArea()}${+new Date()}`;
    const settingName4 = `${faker.name.jobArea()}${+new Date()}`;

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
                SettingModule,
            ],
        }).compile();

        settingService = moduleRef.get<SettingService>(SettingService);

        setting = await settingService.create({
            name: `${faker.name.jobArea()}${+new Date()}`,
            type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            value: 'true',
        });
    });

    afterEach(async () => {
        jest.clearAllMocks();

        try {
            await settingService.deleteMany({ _id: setting._id });
            await settingService.deleteMany({
                name: {
                    $in: [
                        settingName1,
                        settingName2,
                        settingName3,
                        settingName4,
                    ],
                },
            });
        } catch (err: any) {
            console.error(err);
        }
    });

    it('should be defined', () => {
        expect(settingService).toBeDefined();
    });

    describe('findAll', () => {
        it('get all setting', async () => {
            const result: SettingEntity[] = await settingService.findAll({
                name: setting.name,
            });

            jest.spyOn(settingService, 'findAll').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
            expect(result[0]._id).toBe(setting._id);
        });

        it('get all setting with limit and offset', async () => {
            const result = await settingService.findAll(
                {
                    name: setting.name,
                },
                { paging: { limit: 1, offset: 0 } }
            );

            jest.spyOn(settingService, 'findAll').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
            expect(result[0]._id).toBe(setting._id);
        });

        it('get all setting with limit, offset, and sort', async () => {
            const result = await settingService.findAll(
                {
                    name: setting.name,
                },
                {
                    paging: { limit: 1, offset: 0 },
                    order: { name: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.ASC },
                }
            );

            jest.spyOn(settingService, 'findAll').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(1);
            expect(result[0]._id).toBe(setting._id);
        });
    });

    describe('getTotal', () => {
        it('should return a number of total data', async () => {
            const result: number = await settingService.getTotal({
                name: setting.name,
            });

            jest.spyOn(settingService, 'getTotal').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(1);
        });
    });

    describe('findOneById', () => {
        it('should be success', async () => {
            const result: SettingDoc = await settingService.findOneById(
                setting._id
            );

            jest.spyOn(settingService, 'findOneById').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
        });
    });

    describe('findOneByName', () => {
        it('should be return a setting entity', async () => {
            const result: SettingDoc = await settingService.findOneByName(
                setting.name
            );

            jest.spyOn(settingService, 'findOneByName').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
        });
    });

    describe('create', () => {
        it('should be create a new setting, number', async () => {
            const result: SettingDoc = await settingService.create({
                name: settingName1,
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                description: 'aaa',
                value: '1',
            });

            jest.spyOn(settingService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(settingName1);
        });

        it('should be create a new setting, string', async () => {
            const result: SettingDoc = await settingService.create({
                name: settingName2,
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.STRING,
                value: '1',
            });

            jest.spyOn(settingService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(settingName2);
        });

        it('should be create a new setting, boolean', async () => {
            const result: SettingDoc = await settingService.create({
                name: settingName3,
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                description: 'aaa',
                value: 'true',
            });

            jest.spyOn(settingService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(settingName3);
        });

        it('should be create a new setting, string', async () => {
            const result: SettingDoc = await settingService.create({
                name: settingName4,
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                value: '1,2,3',
            });

            jest.spyOn(settingService, 'create').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result.name).toBe(settingName4);
        });
    });

    describe('updateValue', () => {
        it('should be update a value, number', async () => {
            const result: SettingDoc = await settingService.updateValue(
                setting,
                {
                    value: '1',
                    type: ENUM_SETTING_DATA_TYPE.NUMBER,
                }
            );

            jest.spyOn(settingService, 'updateValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
            expect(result.type).toBe(ENUM_SETTING_DATA_TYPE.NUMBER);
            expect(result.value).toBe('1');
        });

        it('should be update a value, string', async () => {
            const result: SettingDoc = await settingService.updateValue(
                setting,
                {
                    value: 'aaa',
                    type: ENUM_SETTING_DATA_TYPE.STRING,
                }
            );

            jest.spyOn(settingService, 'updateValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
            expect(result.type).toBe(ENUM_SETTING_DATA_TYPE.STRING);
            expect(result.value).toBe('aaa');
        });

        it('should be update a value, boolean', async () => {
            const result: SettingDoc = await settingService.updateValue(
                setting,
                {
                    value: 'true',
                    type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                }
            );

            jest.spyOn(settingService, 'updateValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
            expect(result.type).toBe(ENUM_SETTING_DATA_TYPE.BOOLEAN);
            expect(result.value).toBe('true');
        });

        it('should be update a value, array of string', async () => {
            const result: SettingDoc = await settingService.updateValue(
                setting,
                {
                    value: 'aa,bb,cc',
                    type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                }
            );

            jest.spyOn(settingService, 'updateValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
            expect(result.type).toBe(ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING);
            expect(result.value).toBe('aa,bb,cc');
        });
    });

    describe('delete', () => {
        it('should be success', async () => {
            const result: SettingDoc = await settingService.delete(setting);

            jest.spyOn(settingService, 'delete').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result._id).toBe(setting._id);
        });
    });

    describe('getMaintenance', () => {
        it('should be return a setting', async () => {
            const result: boolean = await settingService.getMaintenance();

            jest.spyOn(settingService, 'getMaintenance').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeDefined();
        });
    });

    describe('getMobileNumberCountryCodeAllowed', () => {
        it('should be return a setting', async () => {
            const result: string[] =
                await settingService.getMobileNumberCountryCodeAllowed();

            jest.spyOn(
                settingService,
                'getMobileNumberCountryCodeAllowed'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
        });
    });

    describe('getPasswordAttempt', () => {
        it('should be return a setting', async () => {
            const result: boolean = await settingService.getPasswordAttempt();

            jest.spyOn(
                settingService,
                'getPasswordAttempt'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
        });
    });

    describe('getMaxPasswordAttempt', () => {
        it('should be return a setting', async () => {
            const result: number = await settingService.getMaxPasswordAttempt();

            jest.spyOn(
                settingService,
                'getMaxPasswordAttempt'
            ).mockReturnValueOnce(result as any);

            expect(result).toBeDefined();
        });
    });

    describe('deleteMany', () => {
        it('should be success', async () => {
            const result: boolean = await settingService.deleteMany({
                _id: setting._id,
            });
            jest.spyOn(settingService, 'deleteMany').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });
    });

    describe('getValue', () => {
        it('should be return a number value', async () => {
            const setting1: SettingDoc = await settingService.create({
                name: settingName1,
                value: '1',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            });
            const result: number = await settingService.getValue<number>(
                setting1
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(typeof result).toBe('number');
        });

        it('should be return a string value', async () => {
            const setting2: SettingDoc = await settingService.create({
                name: settingName2,
                value: 'aaa',
                type: ENUM_SETTING_DATA_TYPE.STRING,
            });
            const result: string = await settingService.getValue<string>(
                setting2
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('should be return a boolean value true', async () => {
            const setting3: SettingDoc = await settingService.create({
                name: settingName3,
                value: 'true',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            });
            const result: boolean = await settingService.getValue<boolean>(
                setting3
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(typeof result).toBe('boolean');
        });

        it('should be return a boolean value false', async () => {
            const setting3: SettingDoc = await settingService.create({
                name: settingName3,
                value: 'false',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
            });
            const result: boolean = await settingService.getValue<boolean>(
                setting3
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(typeof result).toBe('boolean');
        });

        it('should be return a array of string value', async () => {
            const setting4: SettingDoc = await settingService.create({
                name: settingName4,
                value: '1,2,3',
                type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
            });
            const result: string[] = await settingService.getValue<string[]>(
                setting4
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(Array.isArray(result)).toBe(true);
            expect(typeof result[0]).toBe('string');
        });
    });

    describe('checkValue', () => {
        it('should be check a number value', async () => {
            const result: boolean = await settingService.checkValue(
                '1',
                ENUM_SETTING_DATA_TYPE.NUMBER
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be check a string value', async () => {
            const result: boolean = await settingService.checkValue(
                'aaaa',
                ENUM_SETTING_DATA_TYPE.STRING
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be check a boolean true value', async () => {
            const result: boolean = await settingService.checkValue(
                'true',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be check a boolean false value', async () => {
            const result: boolean = await settingService.checkValue(
                'false',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be check a array of string value', async () => {
            const result: boolean = await settingService.checkValue(
                '1,2,3',
                ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeTruthy();
            expect(result).toBe(true);
        });

        it('should be check error', async () => {
            const result: boolean = await settingService.checkValue(
                'trueaaa',
                ENUM_SETTING_DATA_TYPE.BOOLEAN
            );

            jest.spyOn(settingService, 'getValue').mockReturnValueOnce(
                result as any
            );

            expect(result).toBeFalsy();
            expect(result).toBe(false);
        });
    });
});
