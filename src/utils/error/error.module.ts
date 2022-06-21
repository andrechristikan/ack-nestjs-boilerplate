import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { DebuggerService } from 'src/debugger/service/debugger.service';
import { MessageService } from 'src/message/service/message.service';
import { ErrorHttpFilter } from './filter/error.filter';
import { ErrorLogInterceptor } from './interceptor/error.log.interceptor';

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
        {
            provide: APP_INTERCEPTOR,
            inject: [Reflector, DebuggerService],
            useFactory: (
                reflector: Reflector,
                debuggerService: DebuggerService
            ) => new ErrorLogInterceptor(reflector, debuggerService),
        },
    ],
    imports: [],
})
export class ErrorModule {}
