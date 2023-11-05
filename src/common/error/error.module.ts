import { LogLevel, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorHttpFilter } from './filters/error.http.filter';
import { ErrorMetaGuard } from './guards/error.meta.guard';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ENUM_APP_ENVIRONMENT } from 'src/app/constants/app.enum.constant';

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
    imports: [
        SentryModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                dsn: configService.get('debugger.sentry.dsn'),
                debug: false,
                environment: configService.get<ENUM_APP_ENVIRONMENT>('app.env'),
                release: configService.get<string>('app.repoVersion'),
                logLevels: configService.get<LogLevel[]>(
                    'debugger.sentry.logLevel'
                ),
                close: {
                    enabled: true,
                    timeout: configService.get<number>(
                        'debugger.sentry.timeout'
                    ),
                },
            }),
            inject: [ConfigService],
        }),
    ],
})
export class ErrorModule {}
