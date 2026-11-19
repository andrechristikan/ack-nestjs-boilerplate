import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Policy } from '@generated/prisma-client/client';
import type { PolicyRequestDto } from '@modules/policy/dtos/request/policy.request.dto';
import type { PolicyUpdateRequestDto } from '@modules/policy/dtos/request/policy.update.request.dto';

export interface IPolicyRepository {
    findOneByRoleIdAndId(roleId: string, id: string): Promise<Policy | null>;
    findOneByRoleIdAndIdInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<Policy | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: PolicyRequestDto
    ): Promise<Policy>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: PolicyUpdateRequestDto
    ): Promise<Policy | null>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<boolean>;
}
