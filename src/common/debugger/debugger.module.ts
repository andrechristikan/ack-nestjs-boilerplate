import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionsModule } from 'src/common/debugger/debugger.options.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';

@Module({
    providers: [DebuggerService],
    exports: [DebuggerService],
    controllers: [],
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
