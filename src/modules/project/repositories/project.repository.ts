import { DatabaseService } from '@common/database/services/database.service';
import {
    IPaginationQueryCursorParams,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import {
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    Project,
    ProjectMember,
} from '@prisma/client';

type ProjectCreateData = Pick<
    Project,
    'tenantId' | 'name' | 'status' | 'createdBy' | 'updatedBy'
>;
type ProjectUpdateData = Pick<Project, 'updatedBy'> &
    Partial<Pick<Project, 'name' | 'status'>> & {
        deletedAt?: Date | null;
    };
type ProjectMemberCreateData = Pick<
    ProjectMember,
    'projectId' | 'userId' | 'roleId' | 'status' | 'createdBy' | 'updatedBy'
>;

@Injectable()
export class ProjectRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPaginationOffsetByTenant(
        tenantId: string,
        { where, ...params }: IPaginationQueryOffsetParams
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
                status: EnumProjectStatus.active,
                deletedAt: null,
            },
        });
    }

    async create(data: ProjectCreateData): Promise<Project> {
        return this.databaseService.project.create({
            data: {
                ...data,
                deletedAt: null,
            },
        });
    }

    async update(projectId: string, data: ProjectUpdateData): Promise<Project> {
        return this.databaseService.project.update({
            where: { id: projectId },
            data,
        });
    }

    async addMember(data: ProjectMemberCreateData): Promise<ProjectMember> {
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
                role: true,
                project: true,
            },
        });
    }

    async findMembersWithPaginationOffsetByProject(
        projectId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.offset<IProjectMember>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    projectId,
                    status: EnumProjectMemberStatus.active,
                    deletedAt: null,
                    project: {
                        deletedAt: null,
                    },
                },
                include: {
                    project: true,
                    role: true,
                },
            }
        );
    }

    async findMembersWithPaginationOffsetByUser(
        userId: string,
        { where, ...params }: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.offset<IProjectMember>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumProjectMemberStatus.active,
                    deletedAt: null,
                    project: {
                        status: EnumProjectStatus.active,
                        deletedAt: null,
                    },
                },
                include: {
                    project: true,
                    role: true,
                },
            }
        );
    }

    async findMembershipsWithPaginationCursorByUser(
        userId: string,
        { where, ...params }: IPaginationQueryCursorParams
    ): Promise<IResponsePagingReturn<IProjectMember>> {
        return this.paginationService.cursor<IProjectMember>(
            this.databaseService.projectMember,
            {
                ...params,
                where: {
                    ...where,
                    userId,
                    status: EnumProjectMemberStatus.active,
                    deletedAt: null,
                    project: {
                        deletedAt: null,
                    },
                },
                include: {
                    role: true,
                    project: true,
                },
            }
        );
    }
}
