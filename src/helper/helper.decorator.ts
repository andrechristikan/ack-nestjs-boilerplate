import { Inject } from '@nestjs/common';

export function Helper(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`HelperService`);
}
