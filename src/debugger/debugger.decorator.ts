import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

export function Debugger(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(WINSTON_MODULE_PROVIDER);
}
