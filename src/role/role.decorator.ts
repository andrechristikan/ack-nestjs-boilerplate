import { Inject } from '@nestjs/common';

export function Role(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(`RoleService`);
}
