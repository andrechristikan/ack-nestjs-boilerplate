import { DynamicModule, Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionsModule } from 'src/common/debugger/debugger.options.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';

@Global()
@Module({})
export class DebuggerModule {
    static forRoot(): DynamicModule {
        let module: DynamicModule;

        if (
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE === 'true' ||
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE === 'true'
        ) {
            module = WinstonModule.forRootAsync({
                inject: [DebuggerOptionService],
                imports: [DebuggerOptionsModule],
                useFactory: (debuggerOptionsService: DebuggerOptionService) =>
                    debuggerOptionsService.createLogger(),
            });
        }

        return {
            module: DebuggerModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [module],
        };
    }
}
