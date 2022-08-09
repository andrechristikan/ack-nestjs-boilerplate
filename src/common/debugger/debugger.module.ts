import { Global, Module } from '@nestjs/common';
import { DebuggerOptionService } from './services/debugger.option.service';
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
    imports: [],
})
export class DebuggerModule {}
