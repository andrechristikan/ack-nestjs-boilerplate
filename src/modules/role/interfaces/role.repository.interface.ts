import {
    IPaginationIn,
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IRole,
    IRoleCreate,
    IRoleUpdate,
    IRoleWithPolicies,
    IRoleWithPolicyCount,
} from '@modules/role/interfaces/role.interface';
import { Prisma, Role } from '@generated/prisma-client';

export interface IRoleRepository {
    findWithPaginationOffsetByAdmin(
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>>;
    findWithPaginationCursorBySystem(
        {
            where,
            ...params
        }: IPaginationQueryCursorParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<IRoleWithPolicyCount>>;
    findOneWithPoliciesById(id: string): Promise<IRoleWithPolicies | null>;
    findOneById(id: string): Promise<IRole | null>;
    findOneByName(name: string): Promise<IRole | null>;
    existsById(id: string): Promise<boolean>;
    existsByName(name: string): Promise<boolean>;
    isUsedById(id: string): Promise<boolean>;
    create(data: IRoleCreate): Promise<IRoleWithPolicies>;
    update(id: string, data: IRoleUpdate): Promise<IRoleWithPolicies>;
    delete(id: string): Promise<Role>;
}
