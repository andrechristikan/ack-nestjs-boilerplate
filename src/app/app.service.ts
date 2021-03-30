import { Injectable } from '@nestjs/common';
import { Message } from 'src/message/message.decorator';
import { MessageService } from 'src/message/message.service';

@Injectable()
export class AppService {
    constructor(@Message() private readonly messageService: MessageService) {}
    async getHello(): Promise<string> {
        return  this.messageService.get('app.hello');
    }
}
