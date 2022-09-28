import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { DebuggerService } from './services/debugger.service';

@Module({
    providers: [DebuggerOptionService, DebuggerService],
    exports: [DebuggerOptionService, DebuggerService],
    imports: [],
})
export class DebuggerOptionsModule {}

@Global()
@Module({
    providers: [DebuggerService],
    exports: [DebuggerService],
    imports: [
        WinstonModule.forRootAsync({
            inject: [DebuggerOptionService],
            imports: [DebuggerOptionsModule],
            useFactory: (debuggerOptionsService: DebuggerOptionService) =>
                debuggerOptionsService.createLogger(),
        }),
    ],
})
export class DebuggerModule {}
