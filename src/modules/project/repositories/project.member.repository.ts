import type { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import type { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import type { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { EnumProjectMemberRole, Prisma } from '@generated/prisma-client/client';
import type { ProjectMember } from '@generated/prisma-client/client';
import type { IProjectMember } from '@modules/project/interfaces/project.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import type { IProjectMemberRepository } from '@modules/project/interfaces/project.member-repository.interface';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectMemberRepository implements IProjectMemberRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findOneByProjectAndUser(
        projectId: string,
        userId: string
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                projectId,
                userId,
            },
        });
    }

    async findByIdAndProject(
        projectMemberId: string,
        projectId: string
    ): Promise<ProjectMember | null> {
        return this.databaseService.client.projectMember.findFirst({
            where: {
                id: projectMemberId,
                projectId,
            },
        });
    }

    async findWithPaginationCursor(
        projectId: string,
        {
            where,
            ...others
        }: IPaginationQueryCursorParams<Prisma.ProjectMemberWhereInput>
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.cursor<
            IProjectMember,
            Prisma.ProjectMemberWhereInput
        >(this.databaseService.client.projectMember, {
            ...others,
            where: {
                ...where,
                projectId,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async create(
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        return this.databaseService.client.projectMember.create({
            data: {
                projectId,
                userId,
                role,
                createdBy,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async createInTx(
        tx: IDatabaseTransactionClient,
        projectId: string,
        userId: string,
        role: EnumProjectMemberRole,
        createdBy: string
    ): Promise<IProjectMember> {
        return tx.projectMember.create({
            data: {
                projectId,
                userId,
                role,
                createdBy,
            },
            include: {
                user: {
                    select: UserRefSelect,
                },
            },
        });
    }

    async updateRole(
        targetMemberId: string,
        newRole: EnumProjectMemberRole
    ): Promise<void> {
        await this.databaseService.client.projectMember.update({
            where: { id: targetMemberId },
            data: {
                role: newRole,
            },
        });
    }

    async removeMember(targetMemberId: string): Promise<void> {
        await this.databaseService.client.projectMember.delete({
            where: { id: targetMemberId },
        });
    }
}
