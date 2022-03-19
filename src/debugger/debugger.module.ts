import { Global, Module } from '@nestjs/common';
import { DebuggerOptionService } from './service/debugger.option.service';
import { DebuggerService } from './service/debugger.service';

@Global()
@Module({
    providers: [DebuggerOptionService, DebuggerService],
    exports: [DebuggerOptionService, DebuggerService],
    imports: [],
})
export class DebuggerModule {}
