import { Inject } from '@nestjs/common';
import { MessageService } from './message.service';

export function Message(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(MessageService);
}
