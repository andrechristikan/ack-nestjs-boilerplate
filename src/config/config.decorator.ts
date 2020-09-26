import { Inject } from '@nestjs/common';

export function Config(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`ConfigService`);
}
