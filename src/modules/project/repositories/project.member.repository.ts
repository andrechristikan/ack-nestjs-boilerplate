import { IDatabaseTransactionClient } from '@common/database/interfaces/database.client.interface';
import { DatabaseService } from '@common/database/services/database.service';
import { IPaginationQueryCursorParams } from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    EnumProjectMemberRole,
    Prisma,
    ProjectMember,
} from '@generated/prisma-client';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import { UserRefSelect } from '@modules/user/constants/user.constant';
import { IProjectMemberRepository } from '@modules/project/interfaces/project.member.repository.interface';
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

    async updateRoleInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string,
        newRole: EnumProjectMemberRole,
        actorId: string
    ): Promise<void> {
        await tx.projectMember.update({
            where: { id: targetMemberId },
            data: {
                role: newRole,
                updatedBy: actorId,
            },
        });
    }

    async removeMemberInTx(
        tx: IDatabaseTransactionClient,
        targetMemberId: string
    ): Promise<void> {
        await tx.projectMember.delete({
            where: { id: targetMemberId },
        });
    }
}
