import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { LoggerOptions } from 'winston';

describe('DebuggerOptionService', () => {
    let service: DebuggerOptionService;

    beforeEach(async () => {
        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                DebuggerOptionService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string) => {
                            switch (key) {
                                case 'debugger.system.writeIntoFile':
                                    return true;
                                case 'debugger.system.writeIntoConsole':
                                    return true;
                                case 'debugger.system.maxSize':
                                    return '7d';
                                case 'debugger.system.maxFiles':
                                default:
                                    return '2m';
                            }
                        }),
                    },
                },
            ],
        }).compile();

        service = moduleRef.get<DebuggerOptionService>(DebuggerOptionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createLogger', () => {
        it('should return an object containing necessary options for winston logger, can write into console and file', () => {
            const loggerOptions: LoggerOptions & { transports: any[] } =
                service.createLogger() as any;

            expect(loggerOptions).toHaveProperty('format');
            expect(loggerOptions.format).toBeDefined;

            expect(loggerOptions).toHaveProperty('transports');
            expect(loggerOptions.transports.length).toBeGreaterThan(0);
        });

        it('should return an object containing necessary options for winston logger, no write into console and file', () => {
            jest.spyOn(service['configService'], 'get').mockImplementation(
                (key: string) => {
                    switch (key) {
                        case 'debugger.system.writeIntoFile':
                            return false;
                        case 'debugger.system.writeIntoConsole':
                            return false;
                        case 'debugger.system.maxSize':
                            return '7d';
                        case 'debugger.system.maxFiles':
                        default:
                            return '2m';
                    }
                }
            );

            const loggerOptions: LoggerOptions & { transports: any[] } =
                service.createLogger() as any;

            expect(loggerOptions).toHaveProperty('format');
            expect(loggerOptions.format).toBeDefined;

            expect(loggerOptions).toHaveProperty('transports');
            expect(loggerOptions.transports.length).toEqual(0);
        });
    });
});
