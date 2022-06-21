import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { MessageService } from 'src/message/service/message.service';
import { ErrorHttpFilter } from './error.filter';

@Module({
    controllers: [],
    providers: [
        {
            provide: APP_FILTER,
            inject: [MessageService],
            useFactory: (messageService: MessageService) => {
                return new ErrorHttpFilter(messageService);
            },
        },
    ],
    imports: [],
})
export class ErrorModule {}
