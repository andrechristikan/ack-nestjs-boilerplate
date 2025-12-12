import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { RoleCreateRequestDto } from '@modules/role/dtos/request/role.create.request.dto';
import { RoleUpdateRequestDto } from '@modules/role/dtos/request/role.update.request.dto';
import { Injectable } from '@nestjs/common';
import { EnumRoleType, Role } from '@prisma/client';

@Injectable()
export class RoleRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPagination(
        { where, ...params }: IPaginationQueryOffsetParams,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<Role>> {
        return this.paginationService.offset<Role>(this.databaseService.role, {
            ...params,
            where: {
                ...where,
                ...type,
            },
        });
    }

    async findOneById(id: string): Promise<Role> {
        return this.databaseService.role.findUnique({
            where: { id },
        });
    }

    async existByName(
        name: string
    ): Promise<{ id: string; type: EnumRoleType } | null> {
        return this.databaseService.role.findFirst({
            where: {
                name: name,
            },
            select: { id: true, type: true },
        });
    }

    async existById(
        id: string
    ): Promise<{ id: string; type: EnumRoleType } | null> {
        return this.databaseService.role.findUnique({
            where: {
                id,
            },
            select: { id: true, type: true },
        });
    }

    async usedByUser(id: string): Promise<{ id: string } | null> {
        return this.databaseService.role.findFirst({
            where: {
                users: {
                    some: {
                        roleId: id,
                    },
                },
            },
            select: { id: true },
        });
    }

    async create({
        name,
        abilities,
        ...others
    }: RoleCreateRequestDto): Promise<Role> {
        return this.databaseService.role.create({
            data: {
                name: name,
                abilities: abilities.map(ability => ({
                    ...ability,
                })),
                ...others,
            },
        });
    }

    async update(
        id: string,
        { abilities, ...others }: RoleUpdateRequestDto
    ): Promise<Role> {
        return this.databaseService.role.update({
            where: { id },
            data: {
                abilities: abilities.map(ability => ({
                    ...ability,
                })),
                ...others,
            },
        });
    }

    async delete(id: string): Promise<Role> {
        return this.databaseService.role.delete({ where: { id } });
    }
}
