import { Test } from '@nestjs/testing';
import { CoreModule } from 'src/core/core.module';
import { DebuggerOptionService } from 'src/debugger/service/debugger.option.service';

describe('DebuggerOptionService', () => {
    let debuggerOptionService: DebuggerOptionService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [CoreModule],
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
