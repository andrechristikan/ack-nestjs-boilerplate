import { Inject } from '@nestjs/common';

export function Response(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`ResponseService`);
}
