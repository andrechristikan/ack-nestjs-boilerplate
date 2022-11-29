import { faker } from '@faker-js/faker';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { ApiKeyModule } from 'src/common/api-key/api-key.module';
import { ApiKeyService } from 'src/common/api-key/services/api-key.service';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DATABASE_CONNECTION_NAME } from 'src/common/database/constants/database.constant';
import { DatabaseDefaultUUID } from 'src/common/database/constants/database.function.constant';
import { DatabaseOptionsModule } from 'src/common/database/database.options.module';
import { DatabaseOptionsService } from 'src/common/database/services/database.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { LoggerCreateDto } from 'src/common/logger/dtos/logger.create.dto';
import { LoggerModule } from 'src/common/logger/logger.module';
import { LoggerService } from 'src/common/logger/services/logger.service';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import configs from 'src/configs';

describe('LoggerService', () => {
    let apiKeyService: ApiKeyService;
    let loggerService: LoggerService;

    const user: Record<string, any> = {
        _id: '623cb7fd37a861a10bac2c91',
        isActive: true,
        salt: '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu',
        passwordExpired: new Date('2023-03-24T18:27:09.500Z'),
        password:
            '$2b$08$GZfqgaDMPpWQ3lJEGQ8Ueu1vJ3C6G3stnkS/5e61bK/4f1.Fuw2Eq',
        role: {
            _id: '623cb7f7965a74bf7a0e9e53',
            accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
            isActive: true,
            permissions: [],
            name: 'admin',
        },
        email: 'admin@mail.com',
        mobileNumber: '08111111111',
        lastName: 'test',
        firstName: 'admin@mail.com',
    };

    const loggerLevel: ENUM_LOGGER_LEVEL = ENUM_LOGGER_LEVEL.INFO;
    const logger: LoggerCreateDto = {
        action: ENUM_LOGGER_ACTION.TEST,
        description: 'test aaa',
        method: ENUM_REQUEST_METHOD.GET,
        tags: [],
        path: '/path',
    };

    const loggerComplete: LoggerCreateDto = {
        action: ENUM_LOGGER_ACTION.TEST,
        description: 'test aaa',
        user: DatabaseDefaultUUID(),
        apiKey: DatabaseDefaultUUID(),
        requestId: DatabaseDefaultUUID(),
        role: {
            _id: DatabaseDefaultUUID(),
            accessFor: ENUM_AUTH_ACCESS_FOR.SUPER_ADMIN,
        },
        method: ENUM_REQUEST_METHOD.GET,
        statusCode: 10000,
        bodies: {
            test: 'aaa',
        },
        params: {
            test: 'bbb',
        },
        path: '/path-complete',
        tags: [],
    };

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
                LoggerModule,
                ApiKeyModule,
            ],
        }).compile();

        loggerService = moduleRef.get<LoggerService>(LoggerService);
        apiKeyService = moduleRef.get<ApiKeyService>(ApiKeyService);

        const createApiKey = await apiKeyService.create(
            {
                name: faker.internet.userName(),
            },
            user
        );

        loggerComplete.apiKey = createApiKey._id;
    });

    describe('info', () => {
        it('should be success', async () => {
            const result = await loggerService.info(logger);
            jest.spyOn(loggerService, 'info').mockImplementation(
                async () => result
            );

            expect(await loggerService.info(logger)).toBe(result);
        });

        it('should be success completed', async () => {
            const result = await loggerService.info(loggerComplete);
            jest.spyOn(loggerService, 'info').mockImplementation(
                async () => result
            );

            expect(await loggerService.info(loggerComplete)).toBe(result);
        });
    });

    describe('debug', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'debug');

            loggerService.debug(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = await loggerService.debug(logger);
            jest.spyOn(loggerService, 'debug').mockImplementation(
                async () => result
            );

            expect(await loggerService.debug(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = await loggerService.debug(loggerComplete);
            jest.spyOn(loggerService, 'debug').mockImplementation(
                async () => result
            );

            expect(await loggerService.debug(loggerComplete)).toBe(result);
        });
    });

    describe('warning', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'warning');

            loggerService.warning(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = await loggerService.warning(logger);
            jest.spyOn(loggerService, 'warning').mockImplementation(
                async () => result
            );

            expect(await loggerService.warning(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = await loggerService.warning(loggerComplete);
            jest.spyOn(loggerService, 'warning').mockImplementation(
                async () => result
            );

            expect(await loggerService.warning(loggerComplete)).toBe(result);
        });
    });

    describe('fatal', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'fatal');

            loggerService.fatal(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = await loggerService.fatal(logger);
            jest.spyOn(loggerService, 'fatal').mockImplementation(
                async () => result
            );

            expect(await loggerService.fatal(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = await loggerService.fatal(loggerComplete);
            jest.spyOn(loggerService, 'fatal').mockImplementation(
                async () => result
            );

            expect(await loggerService.fatal(loggerComplete)).toBe(result);
        });
    });

    describe('raw', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'raw');

            loggerService.raw({ level: loggerLevel, ...logger });
            expect(test).toHaveBeenCalledWith({
                level: loggerLevel,
                ...logger,
            });
        });

        it('should be success', async () => {
            const result = await loggerService.raw({
                level: loggerLevel,
                ...logger,
            });
            jest.spyOn(loggerService, 'raw').mockImplementation(
                async () => result
            );

            expect(
                await loggerService.raw({ level: loggerLevel, ...logger })
            ).toBe(result);
        });

        it('should be success complete', async () => {
            const result = await loggerService.raw({
                level: loggerLevel,
                ...loggerComplete,
            });
            jest.spyOn(loggerService, 'raw').mockImplementation(
                async () => result
            );

            expect(
                await loggerService.raw({
                    level: loggerLevel,
                    ...loggerComplete,
                })
            ).toBe(result);
        });
    });
});
