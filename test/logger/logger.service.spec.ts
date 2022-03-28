import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CoreModule } from 'src/core/core.module';
import { ENUM_LOGGER_ACTION } from 'src/logger/logger.constant';
import { LoggerService } from 'src/logger/service/logger.service';

describe('LoggerService', () => {
    let loggerService: LoggerService;

    const action = ENUM_LOGGER_ACTION.LOGIN;
    const description = 'Description logger';
    const user = `${new Types.ObjectId()}`;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
        }).compile();

        loggerService = moduleRef.get<LoggerService>(LoggerService);
    });

    it('should be defined', () => {
        expect(loggerService).toBeDefined();
    });

    describe('info', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'info');

            await loggerService.info({ action, description, user });
            expect(test).toHaveBeenCalledWith({ action, description, user });
        });

        it('should be success', async () => {
            const logger = loggerService.info({ action, description, user });
            jest.spyOn(loggerService, 'info').mockImplementation(() => logger);

            expect(loggerService.info({ action, description, user })).toBe(
                logger
            );
        });
    });

    describe('debug', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'debug');

            await loggerService.debug({ action, description, user });
            expect(test).toHaveBeenCalledWith({ action, description, user });
        });

        it('should be success', async () => {
            const logger = loggerService.debug({ action, description, user });
            jest.spyOn(loggerService, 'debug').mockImplementation(() => logger);

            expect(loggerService.debug({ action, description, user })).toBe(
                logger
            );
        });
    });

    describe('warning', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'warning');

            await loggerService.warning({ action, description, user });
            expect(test).toHaveBeenCalledWith({ action, description, user });
        });

        it('should be success', async () => {
            const logger = loggerService.warning({ action, description, user });
            jest.spyOn(loggerService, 'warning').mockImplementation(
                () => logger
            );

            expect(loggerService.warning({ action, description, user })).toBe(
                logger
            );
        });
    });

    describe('fatal', () => {
        it('should be called', async () => {
            const test = jest.spyOn(loggerService, 'fatal');

            await loggerService.fatal({ action, description, user });
            expect(test).toHaveBeenCalledWith({ action, description, user });
        });

        it('should be success', async () => {
            const logger = loggerService.fatal({ action, description, user });
            jest.spyOn(loggerService, 'fatal').mockImplementation(() => logger);

            expect(loggerService.fatal({ action, description, user })).toBe(
                logger
            );
        });
    });
});
