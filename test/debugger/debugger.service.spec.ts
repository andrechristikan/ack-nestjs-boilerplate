import { Test } from '@nestjs/testing';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
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
            const err: Error = new Error();

            service.info(err);

            expect(logger.info).toHaveBeenCalledWith(err);
        });
    });

    describe('debug', () => {
        it('should call logger.debug', () => {
            const err: Error = new Error();

            service.debug(err);

            expect(logger.debug).toHaveBeenCalledWith(err);
        });
    });

    describe('warn', () => {
        it('should call logger.warn', () => {
            const err: Error = new Error();

            service.warn(err);

            expect(logger.warn).toHaveBeenCalledWith(err);
        });
    });

    describe('error', () => {
        it('should call logger.error', () => {
            const err: Error = new Error();

            service.error(err);

            expect(logger.error).toHaveBeenCalledWith(err);
        });
    });
});
