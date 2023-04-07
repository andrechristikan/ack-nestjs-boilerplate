import { Test } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { IDebuggerLog } from 'src/common/debugger/interfaces/debugger.interface';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { Logger } from 'winston';

describe('DebuggerService', () => {
    let service: DebuggerService;
    let logger: Logger;

    beforeEach(async () => {
        const moduleRefRef = await Test.createTestingModule({
            providers: [
                DebuggerService,
                {
                    provide: WINSTON_MODULE_PROVIDER,
                    useValue: {
                        info: jest.fn(),
                        debug: jest.fn(),
                        warn: jest.fn(),
                        error: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = moduleRefRef.get<DebuggerService>(DebuggerService);
        logger = moduleRefRef.get<Logger>(WINSTON_MODULE_PROVIDER);
    });

    describe('info', () => {
        it('should call logger.info', () => {
            const requestId = '123';
            const log: IDebuggerLog = {
                description: 'test info log',
                class: 'TestClass',
                function: 'testFunction',
                path: '/test/path',
            };
            const data = { testKey: 'testValue' };

            service.info(requestId, log, data);

            expect(logger.info).toHaveBeenCalledWith(log.description, {
                _id: requestId,
                class: log.class,
                function: log.function,
                path: log.path,
                data,
            });
        });
    });

    describe('debug', () => {
        it('should call logger.debug', () => {
            const requestId = '123';
            const log: IDebuggerLog = {
                description: 'test debug log',
                class: 'TestClass',
                function: 'testFunction',
                path: '/test/path',
            };
            const data = { testKey: 'testValue' };

            service.debug(requestId, log, data);

            expect(logger.debug).toHaveBeenCalledWith(log.description, {
                _id: requestId,
                class: log.class,
                function: log.function,
                path: log.path,
                data,
            });
        });
    });

    describe('warn', () => {
        it('should call logger.warn', () => {
            const requestId = '123';
            const log: IDebuggerLog = {
                description: 'test warn log',
                class: 'TestClass',
                function: 'testFunction',
                path: '/test/path',
            };
            const data = { testKey: 'testValue' };

            service.warn(requestId, log, data);

            expect(logger.warn).toHaveBeenCalledWith(log.description, {
                _id: requestId,
                class: log.class,
                function: log.function,
                path: log.path,
                data,
            });
        });
    });

    describe('error', () => {
        it('should call logger.error', () => {
            const requestId = '123';
            const log: IDebuggerLog = {
                description: 'test error log',
                class: 'TestClass',
                function: 'testFunction',
                path: '/test/path',
            };
            const data = { testKey: 'testValue' };

            service.error(requestId, log, data);

            expect(logger.error).toHaveBeenCalledWith(log.description, {
                _id: requestId,
                class: log.class,
                function: log.function,
                path: log.path,
                data,
            });
        });
    });
});
