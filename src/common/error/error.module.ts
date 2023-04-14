import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorHttpFilter } from './filters/error.http.filter';
import { ErrorMetaGuard } from './guards/error.meta.guard';
import { DebuggerModule } from 'src/common/debugger/debugger.module';

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
    imports: [DebuggerModule.forRoot()],
})
export class ErrorModule {}
