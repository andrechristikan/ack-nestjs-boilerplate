import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DebuggerModule } from 'src/common/debugger/debugger.module';
import { DebuggerInterceptor } from 'src/common/debugger/interceptors/debugger.logger.interceptor';

@Module({
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: DebuggerInterceptor,
        },
    ],
    exports: [],
    controllers: [],
    imports: [DebuggerModule],
})
export class DebuggerLoggerModule {}
