import { Global, Module } from '@nestjs/common';
import { MessageService } from 'message/message.service';

@Global()
@Module({
    providers: [
        {
            provide: 'MessageService',
            useClass: MessageService
        }
    ],
    exports: [MessageService],
    imports: []
})
export class MessageModule {}
