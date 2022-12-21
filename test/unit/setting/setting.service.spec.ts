import { faker } from '@faker-js/faker';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import { ENUM_PAGINATION_SORT_TYPE } from 'src/common/pagination/constants/pagination.enum.constant';
import { ENUM_SETTING_DATA_TYPE } from 'src/common/setting/constants/setting.enum.constant';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingModule } from 'src/common/setting/setting.module';
import configs from 'src/configs';

describe('SettingService', () => {
    let settingService: SettingService;

    const _id = DatabaseDefaultUUID();

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
                SettingModule,
            ],
        }).compile();

        settingService = moduleRef.get<SettingService>(SettingService);
    });

    it('should be defined', () => {
        expect(settingService).toBeDefined();
    });

    describe('findAll', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'findAll');

            await settingService.findAll();
            expect(test).toHaveBeenCalledWith();
        });

        it('should be success', async () => {
            const result = await settingService.findAll({});
            jest.spyOn(settingService, 'findAll').mockImplementation(
                async () => result
            );

            expect(await settingService.findAll({})).toBe(result);
        });

        it('should be success with options limit and skip', async () => {
            const result = await settingService.findAll(
                {},
                { paging: { limit: 1, skip: 1 } }
            );
            jest.spyOn(settingService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await settingService.findAll(
                    {},
                    { paging: { limit: 1, skip: 1 } }
                )
            ).toBe(result);
        });

        it('should be success with options limit, skip, sort', async () => {
            const result = await settingService.findAll(
                {},
                {
                    paging: { limit: 1, skip: 1 },
                    sort: { name: ENUM_PAGINATION_SORT_TYPE.ASC },
                }
            );
            jest.spyOn(settingService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await settingService.findAll(
                    {},
                    {
                        paging: { limit: 1, skip: 1 },
                        sort: { name: ENUM_PAGINATION_SORT_TYPE.ASC },
                    }
                )
            ).toBe(result);
        });
    });

    describe('getTotal', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'getTotal');

            await settingService.getTotal();
            expect(test).toHaveBeenCalledWith();
        });

        it('should be success', async () => {
            const result = await settingService.getTotal({});
            jest.spyOn(settingService, 'getTotal').mockImplementation(
                async () => result
            );

            expect(await settingService.getTotal({})).toBe(result);
        });
    });

    describe('findOneById', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'findOneById');

            await settingService.findOneById(_id);
            expect(test).toHaveBeenCalledWith(_id);
        });

        it('should be success', async () => {
            const result = await settingService.findOneById(_id);
            jest.spyOn(settingService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await settingService.findOneById(_id)).toBe(result);
        });
    });

    describe('findOneByName', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'findOneByName');

            await settingService.findOneByName(_id);
            expect(test).toHaveBeenCalledWith(_id);
        });

        it('should be success', async () => {
            const result = await settingService.findOneByName(_id);
            jest.spyOn(settingService, 'findOneByName').mockImplementation(
                async () => result
            );

            expect(await settingService.findOneByName(_id)).toBe(result);
        });
    });

    describe('create', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'create');

            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const setting = await settingService.create(data);
            expect(test).toHaveBeenCalledWith({
                name: setting.name,
                description: setting.description,
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: setting.value,
            });

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const result = await settingService.create(data);

            jest.spyOn(settingService, 'create').mockImplementation(
                async () => result
            );

            expect(await settingService.create(data)).toBe(result);

            await settingService.deleteOne({ _id: result._id });
        });

        it('should be success without description', async () => {
            const data = {
                name: faker.name.firstName(),
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const result = await settingService.create(data);

            jest.spyOn(settingService, 'create').mockImplementation(
                async () => result
            );

            expect(await settingService.create(data)).toBe(result);

            await settingService.deleteOne({ _id: result._id });
        });

        it('should be success string', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.STRING,
                value: '1',
            };
            const result = await settingService.create(data);
            jest.spyOn(settingService, 'create').mockImplementation(
                async () => result
            );

            expect(await settingService.create(data)).toBe(result);

            await settingService.deleteOne({ _id: result._id });
        });
    });

    describe('updateValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'updateValue');

            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const setting = await settingService.create(data);
            await settingService.updateValue(setting._id, {
                value: '2',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            });
            expect(test).toHaveBeenCalledWith(setting._id, {
                value: '2',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            });

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const setting = await settingService.create(data);

            const result = await settingService.updateValue(setting._id, {
                value: '1',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            });
            jest.spyOn(settingService, 'updateValue').mockImplementation(
                async () => result
            );

            expect(
                await settingService.updateValue(setting._id, {
                    value: '1',
                    type: ENUM_SETTING_DATA_TYPE.NUMBER,
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success string', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                value: '1',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            };
            const setting = await settingService.create(data);

            const result = await settingService.updateValue(setting._id, {
                value: '2',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            });
            jest.spyOn(settingService, 'updateValue').mockImplementation(
                async () => result
            );

            expect(
                await settingService.updateValue(setting._id, {
                    value: '2',
                    type: ENUM_SETTING_DATA_TYPE.NUMBER,
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });
    });

    describe('deleteOne', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'deleteOne');

            const data = {
                name: faker.name.firstName(),
                description: 'test',
                value: '1',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            };
            const setting = await settingService.create(data);
            await settingService.deleteOne({ _id: setting._id });
            expect(test).toHaveBeenCalledWith({ _id: setting._id });
        });

        it('should be success', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                value: '1',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
            };
            const setting = await settingService.create(data);
            const result = await settingService.deleteOne({ _id: setting._id });
            jest.spyOn(settingService, 'deleteOne').mockImplementation(
                async () => result
            );

            expect(await settingService.deleteOne({ _id: setting._id })).toBe(
                result
            );

            await settingService.deleteOne({ _id: setting._id });
        });
    });

    describe('getMaintenance', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'getMaintenance');
            await settingService.getMaintenance();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const value = await settingService.getMaintenance();

            jest.spyOn(settingService, 'getMaintenance').mockImplementation(
                async () => value
            );

            expect(await settingService.getMaintenance()).toBe(value);
        });
    });

    describe('getMobileNumberCountryCodeAllowed', () => {
        it('should be called', async () => {
            const test = jest.spyOn(
                settingService,
                'getMobileNumberCountryCodeAllowed'
            );
            await settingService.getMobileNumberCountryCodeAllowed();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const value =
                await settingService.getMobileNumberCountryCodeAllowed();

            jest.spyOn(
                settingService,
                'getMobileNumberCountryCodeAllowed'
            ).mockImplementation(async () => value);

            expect(
                await settingService.getMobileNumberCountryCodeAllowed()
            ).toBe(value);
        });
    });

    describe('getPasswordAttempt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'getPasswordAttempt');
            await settingService.getPasswordAttempt();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const value = await settingService.getPasswordAttempt();

            jest.spyOn(settingService, 'getPasswordAttempt').mockImplementation(
                async () => value
            );

            expect(await settingService.getPasswordAttempt()).toBe(value);
        });
    });

    describe('getMaxPasswordAttempt', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'getMaxPasswordAttempt');
            await settingService.getMaxPasswordAttempt();

            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const value = await settingService.getMaxPasswordAttempt();

            jest.spyOn(
                settingService,
                'getMaxPasswordAttempt'
            ).mockImplementation(async () => value);

            expect(await settingService.getMaxPasswordAttempt()).toBe(value);
        });
    });

    describe('deleteMany', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'deleteMany');

            await settingService.deleteMany({ name: 'test' });
            expect(test).toHaveBeenCalledWith({ name: 'test' });
        });

        it('should be success', async () => {
            const result = await settingService.deleteMany({
                name: 'test',
            });
            jest.spyOn(settingService, 'deleteMany').mockImplementation(
                async () => result
            );

            expect(await settingService.deleteMany({ name: 'test' })).toBe(
                result
            );
        });
    });

    describe('getValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'getValue');

            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const setting = await settingService.create(data);
            await settingService.getValue(setting);
            expect(test).toHaveBeenCalledWith(setting);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success boolean', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: 'false',
            };
            const setting = await settingService.create(data);

            const result = await settingService.getValue(setting);
            jest.spyOn(settingService, 'getValue').mockImplementation(
                async () => result
            );

            expect(await settingService.getValue(setting)).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success number', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            const setting = await settingService.create(data);

            const result = await settingService.getValue(setting);
            jest.spyOn(settingService, 'getValue').mockImplementation(
                async () => result
            );

            expect(await settingService.getValue(setting)).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success string', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.STRING,
                value: '1aaa',
            };
            const setting = await settingService.create(data);

            const result = await settingService.getValue(setting);
            jest.spyOn(settingService, 'getValue').mockImplementation(
                async () => result
            );

            expect(await settingService.getValue(setting)).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success array of string', async () => {
            const data = {
                name: faker.name.firstName(),
                description: 'test',
                type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                value: '1,3,4',
            };
            const setting = await settingService.create(data);

            const result = await settingService.getValue(setting);
            jest.spyOn(settingService, 'getValue').mockImplementation(
                async () => result
            );

            expect(await settingService.getValue(setting)).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });
    });

    describe('checkValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });

        it('should be success boolean', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: 'false',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });

        it('should be success number', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.NUMBER,
                value: '1',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });

        it('should be success string', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.STRING,
                value: '1aa',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });

        it('should be success array of string', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.ARRAY_OF_STRING,
                value: '1,2,3',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });

        it('should be wrong', async () => {
            const test = jest.spyOn(settingService, 'checkValue');

            const data = {
                type: ENUM_SETTING_DATA_TYPE.BOOLEAN,
                value: '1,2,3',
            };
            await settingService.checkValue(data.value, data.type);
            expect(test).toHaveBeenCalledWith(data.value, data.type);
        });
    });
});
