import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DebuggerModule } from '../debugger/debugger.module';
import { ErrorHttpFilter } from './filters/error.http.filter';
import { ErrorMetaGuard } from './guards/error.meta.guard';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            useClass: ErrorHttpFilter,
        },
        {
            provide: APP_GUARD,
            useClass: ErrorMetaGuard,
        },
    ],
    imports: [DebuggerModule],
})
export class ErrorModule {}
