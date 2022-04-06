import { Test } from '@nestjs/testing';
import { BaseModule } from 'src/core/core.module';
import { DebuggerService } from 'src/debugger/service/debugger.service';

describe('DebuggerService', () => {
    let debuggerService: DebuggerService;

    const sDescription = 'test description';
    const sClass = 'test class';
    const cFunction = 'test function';

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [BaseModule],
        }).compile();

        debuggerService = moduleRef.get<DebuggerService>(DebuggerService);
    });

    it('should be defined', () => {
        expect(debuggerService).toBeDefined();
    });

    describe('info', () => {
        it('should be called', async () => {
            const test = jest.spyOn(debuggerService, 'info');

            debuggerService.info(sDescription, sClass, cFunction);
            expect(test).toHaveBeenCalledWith(sDescription, sClass, cFunction);
        });
    });

    describe('debug', () => {
        it('should be called', async () => {
            const test = jest.spyOn(debuggerService, 'debug');

            debuggerService.debug(sDescription, sClass, cFunction);
            expect(test).toHaveBeenCalledWith(sDescription, sClass, cFunction);
        });
    });

    describe('error', () => {
        it('should be called', async () => {
            const test = jest.spyOn(debuggerService, 'error');

            debuggerService.error(sDescription, sClass, cFunction);
            expect(test).toHaveBeenCalledWith(sDescription, sClass, cFunction);
        });
    });
});
