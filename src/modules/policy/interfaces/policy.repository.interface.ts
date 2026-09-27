import type { Policy } from '@generated/prisma-client/client';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

export interface IPolicyRepository {
    findManyByRoleId(roleId: string): Promise<Policy[]>;
    findOneByRoleIdAndId(roleId: string, id: string): Promise<Policy | null>;
    existsByRoleIdAndPriority(
        roleId: string,
        priority: number,
        excludeId: string | null
    ): Promise<boolean>;
    existsByRoleIdAndId(roleId: string, id: string): Promise<boolean>;
    create(roleId: string, dto: PolicyCreateRequestDto): Promise<Policy>;
    update(id: string, dto: PolicyUpdateRequestDto): Promise<Policy>;
    delete(id: string): Promise<Policy>;
}
