import { Module, Global } from '@nestjs/common';
import { MessageService } from 'src/message/message.service';
import { MessageController } from './message.controller';

@Global()
@Module({
    providers: [MessageService],
    exports: [MessageService],
    imports: [],
    controllers: [MessageController]
})
export class MessageModule {}
