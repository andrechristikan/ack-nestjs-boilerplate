import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

export interface IPolicyRepository {
    findManyByRoleId(roleId: string): Promise<Policy[]>;
    existsByRoleIdAndId(roleId: string, id: string): Promise<boolean>;
    create(roleId: string, data: PolicyRequestDto): Promise<Policy>;
    update(id: string, data: PolicyUpdateRequestDto): Promise<Policy>;
    delete(id: string): Promise<Policy>;
}
