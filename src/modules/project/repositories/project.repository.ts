import { DatabaseService } from '@common/database/services/database.service';
import { HelperService } from '@common/helper/services/helper.service';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IProjectCreate,
    IProjectMember,
    IProjectMemberCreate,
    IProjectMemberDelete,
    IProjectMemberUpdate,
    IProjectMemberWithInvite,
    IProjectMemberWithUser,
    IProjectUpdate,
} from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumProjectInviteStatus,
    EnumProjectMemberRole,
    EnumProjectMemberStatus,
    Project,
    ProjectMember,
} from '@generated/prisma-client';

@Injectable()
export class ProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService,
        private readonly helperService: HelperService
    ) {}

    async findWithPaginationOffsetByTenant(
        tenantId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.offset<Project>(
            this.databaseService.project,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                    deletedAt: null,
                },
            }
        );
    }

    async findWithPaginationOffsetByTenantAndUser(
        tenantId: string,
        userId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.ProjectSelect,
            Prisma.ProjectWhereInput
        >
    ): Promise<IResponsePagingReturn<Project>> {
        return this.paginationService.offset<Project>(
            this.databaseService.project,
            {
                ...params,
                where: {
                    ...where,
                    tenantId,
                    deletedAt: null,
                    members: {
                        some: {
                            userId,
                            status: EnumProjectMemberStatus.active,
                            deletedAt: null,
                        },
                    },
                },
            }
        );
    }

    async findOneById(projectId: string): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                deletedAt: null,
            },
        });
    }

    async findOneByIdAndTenant(
        projectId: string,
        tenantId: string
    ): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                tenantId,
                deletedAt: null,
            },
        });
    }

    async findOneActiveByIdAndTenant(
        projectId: string,
        tenantId: string
    ): Promise<Project | null> {
        return this.databaseService.project.findFirst({
            where: {
                id: projectId,
                tenantId,
                deletedAt: null,
            },
        });
    }

    async findOneBySlugAndTenant(
        tenantId: string,
        slug: string
    ): Promise<Pick<Project, 'id'> | null> {
        return this.databaseService.project.findFirst({
            where: {
                tenantId,
                slug,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });
    }

    async create(data: IProjectCreate): Promise<Project> {
        return this.databaseService.project.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async update(projectId: string, data: IProjectUpdate): Promise<Project> {
        return this.databaseService.project.update({
            where: { id: projectId },
            data,
        });
    }

    async delete(projectId: string, deletedBy: string): Promise<Project> {
        const deletedAt = this.helperService.dateCreate();

        return this.databaseService.project.update({
            where: { id: projectId, deletedAt: null },
            data: {
                updatedBy: deletedBy,
                deletedAt,
                deletedBy,
            },
        });
    }

    async createMember(data: IProjectMemberCreate): Promise<ProjectMember> {
        return this.databaseService.projectMember.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async findMemberByProjectAndUser(
        projectId: string,
        userId: string,
        status?: EnumProjectMemberStatus
    ): Promise<IProjectMember | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                projectId,
                userId,
                deletedAt: null,
                project: {
                    deletedAt: null,
                },
                ...(status ? { status } : {}),
            },
            include: {
                project: true,
            },
        });
    }

    async findOneMemberByIdAndProject(
        memberId: string,
        projectId: string
    ): Promise<IProjectMemberWithUser | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                id: memberId,
                projectId,
                deletedAt: null,
                project: {
                    deletedAt: null,
                },
            },
            include: {
                project: true,
                user: true,
            },
        });
    }

    async updateMember(
        memberId: string,
        data: IProjectMemberUpdate
    ): Promise<ProjectMember> {
        return this.databaseService.projectMember.update({
            where: { id: memberId },
            data,
        });
    }

    async findMembersWithPaginationOffsetByProject(
        projectId: string,
        {
            where,
            ...params
        }: IPaginationQueryOffsetParams<
            Prisma.ProjectMemberSelect,
            Prisma.ProjectMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<IProjectMemberWithInvite>> {
        return this.paginationService.offset<IProjectMemberWithInvite>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    projectId,
                    status: where?.status ?? {
                        in: [
                            EnumProjectMemberStatus.active,
                            EnumProjectMemberStatus.pending,
                        ],
                    },
                    deletedAt: null,
                    project: {
                        deletedAt: null,
                    },
                },
                include: {
                    project: true,
                    user: {
                        select: {
                            id: true,
                            email: true,
                            isVerified: true,
                            verifiedAt: true,
                            projectInvites: {
                                where: {
                                    projectId,
                                },
                                orderBy: {
                                    createdAt: 'desc',
                                },
                                take: 1,
                                select: {
                                    id: true,
                                    createdAt: true,
                                    expiresAt: true,
                                    acceptedAt: true,
                                    revokedAt: true,
                                },
                            },
                        },
                    },
                },
            }
        );
    }

async softDeleteMember(
        memberId: string,
        data: IProjectMemberDelete
    ): Promise<ProjectMember> {
        return this.databaseService.projectMember.update({
            where: { id: memberId },
            data,
        });
    }

    async countActiveMembersByProject(
        projectId: string,
        excludeUserId?: string
    ): Promise<number> {
        return this.databaseService.projectMember.count({
            where: {
                projectId,
                status: EnumProjectMemberStatus.active,
                deletedAt: null,
                ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
            },
        });
    }

    async findAnotherAdminMember(
        projectId: string,
        excludeUserId: string
    ): Promise<Pick<ProjectMember, 'id'> | null> {
        return this.databaseService.projectMember.findFirst({
            where: {
                projectId,
                status: EnumProjectMemberStatus.active,
                role: EnumProjectMemberRole.admin,
                deletedAt: null,
                userId: { not: excludeUserId },
            },
            select: { id: true },
        });
    }

    async deleteWithCascade(
        projectId: string,
        deletedBy: string
    ): Promise<Project> {
        const deletedAt = this.helperService.dateCreate();

        return this.databaseService.$transaction(async tx => {
            const project = await tx.project.update({
                where: { id: projectId, deletedAt: null },
                data: { updatedBy: deletedBy, deletedAt, deletedBy },
            });

            await tx.projectMember.updateMany({
                where: { projectId, deletedAt: null },
                data: { updatedBy: deletedBy, deletedAt, deletedBy },
            });

            await tx.projectInvite.updateMany({
                where: {
                    projectId,
                    status: {
                        in: [
                            EnumProjectInviteStatus.pending,
                            EnumProjectInviteStatus.expired,
                        ],
                    },
                    revokedAt: null,
                    acceptedAt: null,
                },
                data: {
                    status: EnumProjectInviteStatus.revoked,
                    revokedAt: deletedAt,
                    updatedBy: deletedBy,
                },
            });

            return project;
        });
    }

    async createWithMembers(
        data: IProjectCreate,
        members: Array<{
            userId: string;
            role: EnumProjectMemberRole;
            status: EnumProjectMemberStatus;
            createdBy: string;
            updatedBy: string;
        }>
    ): Promise<Project> {
        return this.databaseService.$transaction(async tx => {
            const project = await tx.project.create({
                data: { ...data, deletedAt: null },
            });

            for (const member of members) {
                await tx.projectMember.create({
                    data: { ...member, projectId: project.id, deletedAt: null },
                });
            }

            return project;
        });
    }
}
