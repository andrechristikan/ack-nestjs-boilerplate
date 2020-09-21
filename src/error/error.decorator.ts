import { Inject } from '@nestjs/common';

export function Error(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number,
) => void {
    return Inject(`ErrorService`);
}
