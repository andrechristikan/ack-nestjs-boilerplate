import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CacheService } from 'src/cache/service/cache.service';
import { MessageService } from 'src/message/service/message.service';
import { ErrorHttpFilter } from './error.filter';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            inject: [MessageService, CacheService],
            useFactory: (
                messageService: MessageService,
                cacheService: CacheService
            ) => {
                return new ErrorHttpFilter(cacheService, messageService);
            },
        },
    ],
    imports: [],
})
export class ErrorModule {}
