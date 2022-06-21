import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VersionInterceptor } from './interceptor/version.interceptor';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) =>
                new VersionInterceptor(configService),
        },
    ],
    imports: [],
})
export class VersionModule {}
