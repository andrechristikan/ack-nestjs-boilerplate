import { Injectable } from '@nestjs/common';
import { v7 as uuid } from 'uuid';

@Injectable()
export class SessionUtil {
    createSessionId(): string {
        return uuid();
    }
}
