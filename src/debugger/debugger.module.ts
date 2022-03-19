import { Global, Module } from '@nestjs/common';
import {
    DebuggerOptionService,
    DebuggerService,
} from 'src/debugger/debugger.service';

@Global()
@Module({
    providers: [DebuggerOptionService, DebuggerService],
    exports: [DebuggerOptionService, DebuggerService],
    imports: [],
})
export class DebuggerModule {}
