import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { DebuggerOptionsModule } from 'src/common/debugger/debugger.options.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';
import winston from 'winston';

describe('DebuggerOptionService ', () => {
    let debuggerOptionService: DebuggerOptionService;

    beforeEach(async () => {
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
                DebuggerOptionsModule,
            ],
        }).compile();

        debuggerOptionService = moduleRef.get<DebuggerOptionService>(
            DebuggerOptionService
        );
    });

    afterEach(async () => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(debuggerOptionService).toBeDefined();
    });

    describe('createLogger only write into console and file', () => {
        beforeEach(async () => {
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE = 'true';
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
                    DebuggerOptionsModule,
                ],
            }).compile();

            debuggerOptionService = moduleRef.get<DebuggerOptionService>(
                DebuggerOptionService
            );
        });

        it('must write into console and file', async () => {
            const result: winston.LoggerOptions =
                debuggerOptionService.createLogger();

            jest.spyOn(
                debuggerOptionService,
                'createLogger'
            ).mockReturnValueOnce(result);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(Array.isArray(result.transports)).toBe(true);
            expect((result.transports as []).length).toBe(4);
        });
    });

    describe('createLogger only write into console', () => {
        beforeEach(async () => {
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE = 'true';
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE = 'false';

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
                    DebuggerOptionsModule,
                ],
            }).compile();

            debuggerOptionService = moduleRef.get<DebuggerOptionService>(
                DebuggerOptionService
            );
        });

        it('must write into console ', async () => {
            const result: winston.LoggerOptions =
                debuggerOptionService.createLogger();

            jest.spyOn(
                debuggerOptionService,
                'createLogger'
            ).mockReturnValueOnce(result);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(Array.isArray(result.transports)).toBe(true);
            expect((result.transports as []).length).toBe(1);
        });
    });

    describe('createLogger only write into file', () => {
        beforeEach(async () => {
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE = 'false';
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
                    DebuggerOptionsModule,
                ],
            }).compile();

            debuggerOptionService = moduleRef.get<DebuggerOptionService>(
                DebuggerOptionService
            );
        });

        it('must write into file', async () => {
            const result: winston.LoggerOptions =
                debuggerOptionService.createLogger();

            jest.spyOn(
                debuggerOptionService,
                'createLogger'
            ).mockReturnValueOnce(result);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(Array.isArray(result.transports)).toBe(true);
            expect((result.transports as []).length).toBe(3);
        });
    });

    describe('createLogger write file and console inactive', () => {
        beforeEach(async () => {
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE = 'false';
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE = 'false';

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
                    DebuggerOptionsModule,
                ],
            }).compile();

            debuggerOptionService = moduleRef.get<DebuggerOptionService>(
                DebuggerOptionService
            );
        });

        it('must not write to file or console', async () => {
            const result: winston.LoggerOptions =
                debuggerOptionService.createLogger();

            jest.spyOn(
                debuggerOptionService,
                'createLogger'
            ).mockReturnValueOnce(result);

            expect(result).toBeDefined();
            expect(result).toBeTruthy();
            expect(Array.isArray(result.transports)).toBe(true);
            expect((result.transports as []).length).toBe(0);
        });
    });
});
