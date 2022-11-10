import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionsModule } from 'src/common/debugger/debugger.options.module';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { DebuggerService } from 'src/common/debugger/services/debugger.service';

@Global()
@Module({})
export class DebuggerModule {
    static forRoot(): DynamicModule {
        let module: DynamicModule;
        let provider: Provider;

        if (
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE === 'true' ||
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE === 'true'
        ) {
            provider = DebuggerService;
            module = WinstonModule.forRootAsync({
                inject: [DebuggerOptionService],
                imports: [DebuggerOptionsModule],
                useFactory: (debuggerOptionsService: DebuggerOptionService) =>
                    debuggerOptionsService.createLogger(),
            });
        }

        return {
            module: DebuggerModule,
            providers: [provider],
            exports: [],
            controllers: [],
            imports: [module],
        };
    }
}
