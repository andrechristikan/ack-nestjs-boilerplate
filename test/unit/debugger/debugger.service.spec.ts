import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DebuggerModule } from 'src/common/debugger/debugger.module';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';

describe('DebuggerService', () => {
    let debuggerService: DebuggerService;

    const sDescription = 'test description';
    const sClass = 'test class';
    const cFunction = 'test function';
    const data = { test: 'test' };

    beforeEach(async () => {
        process.env.DEBUGGER_HTTP_WRITE_INTO_CONSOLE = 'true';
        process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE = 'true';
        process.env.DEBUGGER_HTTP_WRITE_INTO_FILE = 'true';
        process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE = 'true';

        const moduleRef = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    load: configs,
                    isGlobal: true,
                    cache: true,
                    envFilePath: ['.env'],
                    expandVariables: true,
                }),
                HelperModule,
                DebuggerModule.forRoot(),
            ],
        }).compile();

        debuggerService = moduleRef.get<DebuggerService>(DebuggerService);
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(debuggerService).toBeDefined();
    });

    describe('info', () => {
        it('should write into log', async () => {
            const result: void = debuggerService.info('DebuggerService', {
                description: sDescription,
                class: sClass,
                function: cFunction,
            });

            jest.spyOn(debuggerService, 'info').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });

        it('should write into log with data', async () => {
            const result: void = debuggerService.info(
                'DebuggerService',
                {
                    description: sDescription,
                    class: sClass,
                    function: cFunction,
                },
                data
            );

            jest.spyOn(debuggerService, 'info').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });
    });

    describe('debug', () => {
        it('should write into log', async () => {
            const result: void = debuggerService.debug('DebuggerService', {
                description: sDescription,
                class: sClass,
                function: cFunction,
            });

            jest.spyOn(debuggerService, 'debug').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });

        it('should write into log with data', async () => {
            const result: void = debuggerService.debug(
                'DebuggerService',
                {
                    description: sDescription,
                    class: sClass,
                    function: cFunction,
                },
                data
            );

            jest.spyOn(debuggerService, 'debug').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });
    });

    describe('warn', () => {
        it('should write into log', async () => {
            const result: void = debuggerService.warn('DebuggerService', {
                description: sDescription,
                class: sClass,
                function: cFunction,
            });

            jest.spyOn(debuggerService, 'warn').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });

        it('should write into log with data', async () => {
            const result: void = debuggerService.warn(
                'DebuggerService',
                {
                    description: sDescription,
                    class: sClass,
                    function: cFunction,
                },
                data
            );

            jest.spyOn(debuggerService, 'warn').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });
    });

    describe('error', () => {
        it('should write into log', async () => {
            const result: void = debuggerService.error('DebuggerService', {
                description: sDescription,
                class: sClass,
                function: cFunction,
            });

            jest.spyOn(debuggerService, 'error').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });

        it('should write into log with data', async () => {
            const result: void = debuggerService.error(
                'DebuggerService',
                {
                    description: sDescription,
                    class: sClass,
                    function: cFunction,
                },
                data
            );

            jest.spyOn(debuggerService, 'error').mockReturnValueOnce(result);

            expect(result).toBeFalsy();
            expect(result).toBeUndefined();
        });
    });
});
