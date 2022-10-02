import { DynamicModule, Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { DebuggerOptionService } from 'src/common/debugger/services/debugger.options.service';
import { DebuggerService } from './services/debugger.service';

@Module({
    providers: [DebuggerOptionService],
    exports: [DebuggerOptionService],
    imports: [],
})
export class DebuggerOptionsModule {}

@Global()
@Module({})
export class DebuggerModule {
    static register(): DynamicModule {
        if (
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_CONSOLE === 'true' ||
            process.env.DEBUGGER_SYSTEM_WRITE_INTO_FILE === 'true'
        ) {
            return {
                module: DebuggerModule,
                controllers: [],
                providers: [DebuggerService],
                exports: [DebuggerService],
                imports: [
                    WinstonModule.forRootAsync({
                        inject: [DebuggerOptionService],
                        imports: [DebuggerOptionsModule],
                        useFactory: (
                            debuggerOptionsService: DebuggerOptionService
                        ) => debuggerOptionsService.createLogger(),
                    }),
                ],
            };
        }

        return {
            module: DebuggerModule,
            providers: [],
            exports: [],
            controllers: [],
            imports: [],
        };
    }
}
