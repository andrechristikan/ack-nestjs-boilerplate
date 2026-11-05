import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

export interface IPolicyRepository {
    findManyByRoleId(roleId: string): Promise<Policy[]>;
    findOneByRoleIdAndId(roleId: string, id: string): Promise<Policy | null>;
    create(roleId: string, data: PolicyRequestDto): Promise<Policy>;
    update(
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy | null>;
    delete(roleId: string, id: string): Promise<boolean>;
}
