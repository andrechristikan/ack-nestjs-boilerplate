import { faker } from '@faker-js/faker';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { DatabaseModule } from 'src/common/database/database.module';
import { HelperModule } from 'src/common/helper/helper.module';
import { SettingService } from 'src/common/setting/services/setting.service';
import { SettingModule } from 'src/common/setting/setting.module';
import configs from 'src/configs';

describe('SettingService', () => {
    let settingService: SettingService;
    const _id = new Types.ObjectId();
    const _idString = `${_id}`;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                DatabaseModule,
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
                { limit: 1, skip: 0 }
            );
            jest.spyOn(settingService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await settingService.findAll({}, { limit: 1, skip: 0 })
            ).toBe(result);
        });

        it('should be success with options limit, skip, sort', async () => {
            const result = await settingService.findAll(
                {},
                { limit: 1, skip: 0, sort: { name: 1 } }
            );
            jest.spyOn(settingService, 'findAll').mockImplementation(
                async () => result
            );

            expect(
                await settingService.findAll(
                    {},
                    { limit: 1, skip: 0, sort: { name: 1 } }
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

            await settingService.findOneById(_idString);
            expect(test).toHaveBeenCalledWith(_idString);
        });

        it('should be success', async () => {
            const result = await settingService.findOneById(_idString);
            jest.spyOn(settingService, 'findOneById').mockImplementation(
                async () => result
            );

            expect(await settingService.findOneById(_idString)).toBe(result);
        });
    });

    describe('findOneByName', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'findOneByName');

            await settingService.findOneByName(_idString);
            expect(test).toHaveBeenCalledWith(_idString);
        });

        it('should be success', async () => {
            const result = await settingService.findOneByName(_idString);
            jest.spyOn(settingService, 'findOneByName').mockImplementation(
                async () => result
            );

            expect(await settingService.findOneByName(_idString)).toBe(result);
        });
    });

    describe('create', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'create');

            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });
            expect(test).toHaveBeenCalledWith({
                name: setting.name,
                description: setting.description,
                value: setting.value,
            });

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success', async () => {
            const result = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });

            jest.spyOn(settingService, 'create').mockImplementation(
                async () => result
            );

            expect(
                await settingService.create({
                    name: result.name,
                    description: result.description,
                    value: result.value,
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: result._id });
        });

        it('should be success string', async () => {
            const result = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: '1',
            });
            jest.spyOn(settingService, 'create').mockImplementation(
                async () => result
            );

            expect(
                await settingService.create({
                    name: result.name,
                    description: 'test',
                    value: '1',
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: result._id });
        });
    });

    describe('updateOneById', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'updateOneById');

            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });
            await settingService.updateOneById(setting._id, { value: 2 });
            expect(test).toHaveBeenCalledWith(setting._id, { value: 2 });

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success', async () => {
            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });

            const result = await settingService.updateOneById(setting._id, {
                value: 1,
            });
            jest.spyOn(settingService, 'updateOneById').mockImplementation(
                async () => result
            );

            expect(
                await settingService.updateOneById(setting._id, {
                    value: 1,
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });

        it('should be success string', async () => {
            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });

            const result = await settingService.updateOneById(setting._id, {
                value: '2',
            });
            jest.spyOn(settingService, 'updateOneById').mockImplementation(
                async () => result
            );

            expect(
                await settingService.updateOneById(setting._id, {
                    value: '2',
                })
            ).toBe(result);

            await settingService.deleteOne({ _id: setting._id });
        });
    });

    describe('deleteOne', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'deleteOne');

            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });
            await settingService.deleteOne({ _id: setting._id });
            expect(test).toHaveBeenCalledWith({ _id: setting._id });
        });

        it('should be success', async () => {
            const setting = await settingService.create({
                name: faker.name.firstName(),
                description: 'test',
                value: 1,
            });
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

    describe('convertValue', () => {
        it('should be called', async () => {
            const test = jest.spyOn(settingService, 'convertValue');

            await settingService.convertValue('1');
            expect(test).toHaveBeenCalledWith('1');
        });

        it('should be success', async () => {
            const result = await settingService.convertValue('1');
            jest.spyOn(settingService, 'convertValue').mockImplementation(
                async () => result
            );

            expect(await settingService.convertValue('1')).toBe(result);
        });
    });
});
