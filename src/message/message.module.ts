import { Module, Global } from '@nestjs/common';
import { MessageService } from 'src/message/message.service';

@Global()
@Module({
    providers: [MessageService],
    exports: [MessageService],
    imports: []
})
export class MessageModule {}
