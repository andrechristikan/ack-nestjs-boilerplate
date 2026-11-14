import { Global, Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { SentryModule as SentryNestModule } from '@sentry/nestjs/setup';
import { SentryService } from '@common/sentry/services/sentry.service';

/** Shared module: SentryService for every filter, service, and processor reporting an error. */
@Global()
@Module({})
export class SentryModule {
    static forRoot(): DynamicModule {
        return {
            module: SentryModule,
            controllers: [],
            providers: [SentryService],
            exports: [SentryService],
            imports: [SentryNestModule.forRoot()],
        };
    }
}
