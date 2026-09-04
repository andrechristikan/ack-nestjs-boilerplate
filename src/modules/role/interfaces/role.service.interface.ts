import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumRoleType, Prisma, Role } from '@generated/prisma-client';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import {
    IRoleCreate,
    IRoleUpdate,
} from '@modules/role/interfaces/role.interface';
import { IUser } from '@modules/user/interfaces/user.interface';

export interface IRoleService {
    getListOffsetByAdmin(
        pagination: IPaginationQueryOffsetParams<Prisma.RoleWhereInput>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<Role>>;
    getOne(id: string): Promise<Role>;
    createByAdmin(data: IRoleCreate): Promise<Role>;
    updateByAdmin(id: string, data: IRoleUpdate): Promise<Role>;
    deleteByAdmin(id: string): Promise<Role>;
    validateRoleGuard(
        user: IUser | null,
        requiredRoles: EnumRoleType[]
    ): Promise<RoleAbilityDto[]>;
}
