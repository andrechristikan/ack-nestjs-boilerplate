import { Inject } from '@nestjs/common';
import { HelperService } from './helper.service';

export function Helper(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(HelperService);
}
