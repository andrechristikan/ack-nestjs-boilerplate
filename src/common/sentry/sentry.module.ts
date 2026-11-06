import { Module } from '@nestjs/common';
import type { DynamicModule } from '@nestjs/common';
import { SentryModule as SentryNestModule } from '@sentry/nestjs/setup';
import { SentryService } from '@common/sentry/services/sentry.service';

@Module({})
export class SentryModule {
    static forRoot(): DynamicModule {
        return {
            module: SentryModule,
            global: true,
            imports: [SentryNestModule.forRoot()],
            providers: [SentryService],
            exports: [SentryService],
            controllers: [],
        };
    }
}
