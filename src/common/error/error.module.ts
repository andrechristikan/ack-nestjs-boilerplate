import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorHttpFilter } from './filters/error.http.filter';
import { ErrorMetaGuard } from './guards/error.meta.guard';

@Global()
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
    imports: [],
})
export class ErrorModule {}
