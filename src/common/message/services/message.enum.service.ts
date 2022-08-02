import { Injectable } from '@nestjs/common';
import { ENUM_MESSAGE_LANGUAGE } from '../constants/message.constant';

@Injectable()
export class MessageEnumService {
    async getLanguages(): Promise<string[]> {
        return Object.values(ENUM_MESSAGE_LANGUAGE);
    }
}
