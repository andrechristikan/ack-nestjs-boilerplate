import { Injectable } from '@nestjs/common';
import { ENUM_MESSAGE_LANGUAGE } from 'src/common/message/constants/message.enum.constant';
import { IMessageEnumService } from 'src/common/message/interfaces/message.enum-service.interface';

@Injectable()
export class MessageEnumService implements IMessageEnumService {
    async getLanguages(): Promise<string[]> {
        return Object.values(ENUM_MESSAGE_LANGUAGE);
    }
}
