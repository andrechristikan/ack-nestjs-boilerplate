import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
    DebuggerModule,
    DebuggerOptionsModule,
} from 'src/common/debugger/debugger.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { HelperModule } from 'src/common/helper/helper.module';
import configs from 'src/configs';

describe('DebuggerOptionService', () => {
    let debuggerOptionService: DebuggerOptionService;

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
                DebuggerModule,
                DebuggerOptionsModule,
            ],
        }).compile();

        debuggerOptionService = moduleRef.get<DebuggerOptionService>(
            DebuggerOptionService
        );
    });

    it('should be defined', () => {
        expect(debuggerOptionService).toBeDefined();
    });

    describe('info', () => {
        it('should be called', async () => {
            const test = jest.spyOn(debuggerOptionService, 'createLogger');

            debuggerOptionService.createLogger();
            expect(test).toHaveBeenCalled();
        });

        it('should be success', async () => {
            const options = debuggerOptionService.createLogger();
            jest.spyOn(
                debuggerOptionService,
                'createLogger'
            ).mockImplementation(() => options);

            expect(debuggerOptionService.createLogger()).toBe(options);
        });
    });
});
