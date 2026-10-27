import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Policy, Prisma } from '@generated/prisma-client/client';
import type { IPolicyRuleWithRole } from '@modules/policy/interfaces/policy.interface';
import type { PolicyCreateRequestDto } from '@modules/policy/dtos/request/policy.create.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

export interface IPolicyRepository {
    /** Extra caller-supplied constraint, AND-composed first. */
    findManyByRoleId(
        roleId: string,
        additionalWhere: Prisma.PolicyWhereInput
    ): Promise<Policy[]>;
    findManyByRoleIds(roleIds: string[]): Promise<IPolicyRuleWithRole[]>;
    findOneByRoleIdAndId(roleId: string, id: string): Promise<Policy | null>;
    existsByRoleIdAndId(roleId: string, id: string): Promise<boolean>;
    createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        dto: PolicyCreateRequestDto
    ): Promise<Policy>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        dto: PolicyUpdateRequestDto
    ): Promise<Policy>;
    deleteInTx(tx: IDatabaseTransactionClient, id: string): Promise<Policy>;
}
