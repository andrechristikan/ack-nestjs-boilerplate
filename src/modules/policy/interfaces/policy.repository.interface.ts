import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type { Policy } from '@generated/prisma-client/client';
import type {
    IPolicyCreate,
    IPolicyRule,
    IPolicyUpdate,
} from '@modules/policy/interfaces/policy.interface';

export interface IPolicyRepository {
    findManyByRoleId(roleId: string): Promise<Policy[]>;
    findManyRulesByRoleId(roleId: string): Promise<IPolicyRule[]>;
    findOneByRoleIdAndId(roleId: string, id: string): Promise<Policy | null>;
    findOneByRoleIdAndIdInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<Policy | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IPolicyCreate
    ): Promise<Policy>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string,
        data: IPolicyUpdate
    ): Promise<Policy | null>;
    deleteInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        id: string
    ): Promise<boolean>;
}
