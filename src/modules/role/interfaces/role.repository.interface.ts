import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import type {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import type { IResponsePaginationReturn } from '@common/response/interfaces/response.interface';
import type {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { EnumRoleType } from '@generated/prisma-client/client';

export interface IRoleRepository {
    findWithPaginationOffsetByAdmin(
        { where, ...params }: IPaginationQueryOffsetParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findWithPaginationCursorBySystem(
        { where, ...params }: IPaginationQueryCursorParams,
        type: Record<string, IPaginationIn> | null
    ): Promise<IResponsePaginationReturn<IRoleWithPolicyCount>>;
    findOneWithPoliciesById(id: string): Promise<IRoleWithPolicies | null>;
    findOneById(id: string): Promise<IRole | null>;
    findOneByName(name: string): Promise<IRole | null>;
    findOneByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRole | null>;
    findOneWithPolicyCountByIdInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<IRoleWithPolicyCount | null>;
    createInTx(
        tx: IDatabaseTransactionClient,
        roleId: string,
        data: IRoleCreate
    ): Promise<IRoleWithPolicies>;
    updateInTx(
        tx: IDatabaseTransactionClient,
        id: string,
        expectedType: EnumRoleType,
        data: IRoleUpdate
    ): Promise<IRoleWithPolicies | null>;
    deleteUnusedInTx(
        tx: IDatabaseTransactionClient,
        id: string
    ): Promise<boolean>;
}
