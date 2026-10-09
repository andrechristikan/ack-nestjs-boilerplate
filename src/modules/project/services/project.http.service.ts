import { PaginationStoreKey } from '@common/pagination/constants/pagination.constant';
import { PaginationQueryUtil } from '@common/pagination/utils/pagination.query.util';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { subject } from '@casl/ability';
import type {
    IResponsePaginationReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import {
    EnumPolicyAction,
    EnumPolicySubject,
    Prisma,
} from '@generated/prisma-client/client';
import type { Project } from '@generated/prisma-client/client';
import { PolicyAbilityDomain } from '@modules/policy/domains/policy.ability.domain';
import type { IEffectivePermission } from '@modules/policy/interfaces/policy.interface';
import {
    ProjectCursorAvailableOrderBy,
    ProjectDefaultAvailableOrderBy,
    ProjectDefaultAvailableSearch,
} from '@modules/project/constants/project.list.constant';
import type { ProjectAdminListRequestDto } from '@modules/project/dtos/request/project.admin-list.request.dto';
import type { ProjectUserListRequestDto } from '@modules/project/dtos/request/project.user-list.request.dto';
import type { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import type { ProjectUpdateSlugRequestDto } from '@modules/project/dtos/request/project.update-slug.request.dto';
import type { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectDomain } from '@modules/project/domains/project.domain';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectHttpService {
    constructor(
        private readonly projectDomain: ProjectDomain,
        private readonly policyAbilityDomain: PolicyAbilityDomain,
        private readonly paginationQueryUtil: PaginationQueryUtil,
        private readonly requestStoreService: RequestStoreService
    ) {}

    async getListForMember(
        workspaceId: string,
        query: ProjectUserListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const { params, storePatch } =
            this.paginationQueryUtil.cursor<Prisma.ProjectWhereInput>(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectCursorAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, storePatch);

        const { data, ...others } = await this.projectDomain.getListForMember(
            workspaceId,
            params,
            accessibleWhere
        );

        return {
            data,
            ...others,
        };
    }

    async createProject(
        workspaceId: string,
        actorId: string,
        { name, description }: ProjectCreateRequestDto
    ): Promise<IResponseReturn<Project>> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.create,
            subject(EnumPolicySubject.Project, { workspaceId })
        );
        const project = await this.projectDomain.createProject(
            workspaceId,
            actorId,
            { name, description }
        );

        return { data: project };
    }

    getProject(project: Project): IResponseReturn<Project> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.read,
            subject(EnumPolicySubject.Project, project)
        );
        return { data: project };
    }

    async updateProject(
        project: Project,
        actorId: string,
        { name, description }: ProjectUpdateRequestDto
    ): Promise<IResponseReturn<Project>> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Project, project)
        );
        const updated = await this.projectDomain.updateProject(
            project,
            actorId,
            { name, description }
        );

        return { data: updated };
    }

    async updateProjectSlug(
        project: Project,
        actorId: string,
        { slug }: ProjectUpdateSlugRequestDto
    ): Promise<IResponseReturn<Project>> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.update,
            subject(EnumPolicySubject.Project, project)
        );
        const updated = await this.projectDomain.updateProjectSlug(
            project,
            actorId,
            slug
        );

        return { data: updated };
    }

    async softDeleteProject(project: Project, actorId: string): Promise<void> {
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.delete,
            subject(EnumPolicySubject.Project, project)
        );
        await this.projectDomain.softDeleteProject(project, actorId);
    }

    async getListForAdmin(
        query: ProjectAdminListRequestDto
    ): Promise<IResponsePaginationReturn<Project>> {
        const accessibleWhere = this.policyAbilityDomain.accessibleWhere(
            EnumPolicyAction.read,
            EnumPolicySubject.Project
        );
        const { params, storePatch } =
            this.paginationQueryUtil.offset<Prisma.ProjectWhereInput>(query, {
                availableSearch: ProjectDefaultAvailableSearch,
                availableOrderBy: ProjectDefaultAvailableOrderBy,
            });
        this.requestStoreService.merge(PaginationStoreKey, {
            ...storePatch,
            filters: {
                ...storePatch.filters,
                ...((query.workspaceId as string | undefined)
                    ? { workspaceId: query.workspaceId as string | undefined }
                    : {}),
            },
        });

        const { data, ...others } = await this.projectDomain.getListForAdmin(
            params,
            query.workspaceId as string | undefined,
            accessibleWhere
        );

        return {
            data,
            ...others,
        };
    }

    async getForAdmin(projectId: string): Promise<IResponseReturn<Project>> {
        const project = await this.projectDomain.getByIdForAdmin(projectId);
        this.policyAbilityDomain.assertCan(
            EnumPolicyAction.read,
            subject(EnumPolicySubject.Project, project)
        );

        return { data: project };
    }

    getEffectivePermissions(project: Project): IResponseReturn<{
        permissions: IEffectivePermission[];
    }> {
        const permissions = this.policyAbilityDomain.getEffectivePermissions([
            subject(EnumPolicySubject.Project, project),
            subject(EnumPolicySubject.ProjectMember, {
                projectId: project.id,
            }),
        ]);

        return { data: { permissions } };
    }
}
