import { Global, Module } from '@nestjs/common';
import { DebuggerService } from 'src/debugger/debugger.service';

@Global()
@Module({
    providers: [DebuggerService],
    exports: [DebuggerService],
    imports: []
})
export class DebuggerModule {}
