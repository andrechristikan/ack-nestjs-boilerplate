import { Inject } from '@nestjs/common';
import { RoleService } from './role.service';

export function Role(): (
    target: Record<string, any>,
    key: string | symbol,
    index?: number
) => void {
    return Inject(RoleService.name);
}
