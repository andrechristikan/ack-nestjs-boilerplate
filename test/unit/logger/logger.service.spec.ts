import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ENUM_AUTH_ACCESS_FOR } from 'src/common/auth/constants/auth.enum.constant';
import { DatabaseConnectionModule } from 'src/common/database/database.module';
import { DatabasePrimaryKey } from 'src/common/database/decorators/database.decorator';
import { HelperModule } from 'src/common/helper/helper.module';
import {
    ENUM_LOGGER_ACTION,
    ENUM_LOGGER_LEVEL,
} from 'src/common/logger/constants/logger.enum.constant';
import { ILogger } from 'src/common/logger/interfaces/logger.interface';
import { LoggerModule } from 'src/common/logger/logger.module';
import { LoggerService } from 'src/common/logger/services/logger.service';
import { ENUM_REQUEST_METHOD } from 'src/common/request/constants/request.enum.constant';
import configs from 'src/configs';
import { v4 } from 'uuid';

describe('LoggerService', () => {
    let loggerService: LoggerService;
    const loggerLevel: ENUM_LOGGER_LEVEL = ENUM_LOGGER_LEVEL.INFO;
    const logger: ILogger = {
        action: ENUM_LOGGER_ACTION.TEST,
        description: 'test aaa',
        method: ENUM_REQUEST_METHOD.GET,
        tags: [],
        path: '/path',
    };
    const loggerComplete: ILogger = {
        action: ENUM_LOGGER_ACTION.TEST,
        description: 'test aaa',
        user: `${DatabasePrimaryKey()}`,
        apiKey: `${DatabasePrimaryKey()}`,
        requestId: v4(),
        role: {
            _id: `${DatabasePrimaryKey()}`,
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
        path: '/path',
        tags: [],
    };

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                DatabaseConnectionModule.register(),
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                LoggerModule,
            ],
        }).compile();

        loggerService = moduleRef.get<LoggerService>(LoggerService);
    });

    it('should be defined', () => {
        expect(loggerService).toBeDefined();
    });

    describe('info', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'info');

            loggerService.info(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = loggerService.info(logger);
            jest.spyOn(loggerService, 'info').mockImplementation(() => result);

            expect(loggerService.info(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = loggerService.info(loggerComplete);
            jest.spyOn(loggerService, 'info').mockImplementation(() => result);

            expect(loggerService.info(loggerComplete)).toBe(result);
        });
    });

    describe('debug', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'debug');

            loggerService.debug(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = loggerService.debug(logger);
            jest.spyOn(loggerService, 'debug').mockImplementation(() => result);

            expect(loggerService.debug(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = loggerService.debug(loggerComplete);
            jest.spyOn(loggerService, 'debug').mockImplementation(() => result);

            expect(loggerService.debug(loggerComplete)).toBe(result);
        });
    });

    describe('warning', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'warning');

            loggerService.warning(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = loggerService.warning(logger);
            jest.spyOn(loggerService, 'warning').mockImplementation(
                () => result
            );

            expect(loggerService.warning(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = loggerService.warning(loggerComplete);
            jest.spyOn(loggerService, 'warning').mockImplementation(
                () => result
            );

            expect(loggerService.warning(loggerComplete)).toBe(result);
        });
    });

    describe('fatal', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'fatal');

            loggerService.fatal(logger);
            expect(test).toHaveBeenCalledWith(logger);
        });

        it('should be success', async () => {
            const result = loggerService.fatal(logger);
            jest.spyOn(loggerService, 'fatal').mockImplementation(() => result);

            expect(loggerService.fatal(logger)).toBe(result);
        });

        it('should be success complete', async () => {
            const result = loggerService.fatal(loggerComplete);
            jest.spyOn(loggerService, 'fatal').mockImplementation(() => result);

            expect(loggerService.fatal(loggerComplete)).toBe(result);
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
            const result = loggerService.raw({ level: loggerLevel, ...logger });
            jest.spyOn(loggerService, 'raw').mockImplementation(() => result);

            expect(loggerService.raw({ level: loggerLevel, ...logger })).toBe(
                result
            );
        });

        it('should be success complete', async () => {
            const result = loggerService.raw({
                level: loggerLevel,
                ...loggerComplete,
            });
            jest.spyOn(loggerService, 'raw').mockImplementation(() => result);

            expect(
                loggerService.raw({ level: loggerLevel, ...loggerComplete })
            ).toBe(result);
        });
    });
});
