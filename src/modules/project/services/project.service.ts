import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { IProjectMember } from '@modules/project/interfaces/project.interface';
import {
    IRequestAppWithProject,
    IRequestAppWithProjectTenant,
} from '@modules/project/interfaces/request.project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import {
    BadRequestException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    EnumRoleScope,
} from '@prisma/client';

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly policyAbilityFactory: PolicyAbilityFactory,
        private readonly projectUtil: ProjectUtil
    ) {}

    // Tenant permissions authorize tenant-wide actions,
    // while project-resource actions are validated by project member permissions.

    async validateProjectMemberGuard(
        request: IRequestAppWithProjectTenant
    ): Promise<IProjectMember> {
        const { user } = request;
        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const projectId = this.resolveProjectIdFromRequest(request);

        const projectMember = await this.projectRepository.findMemberByProjectAndUser(
            projectId,
            user.userId,
            EnumProjectMemberStatus.active
        );

        if (!projectMember?.role) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        if (projectMember.role.scope !== EnumRoleScope.project) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        const tenantId = request.__tenant?.id;
        if (!tenantId || projectMember.project?.tenantId !== tenantId) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        return projectMember;
    }

    async validateProjectPermissionGuard(
        request: IRequestAppWithProject,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'policy.error.predefinedNotFound',
            });
        }

        if (!request.__projectAbilities) {
            const abilities =
                (request.__projectMember?.role?.abilities ?? []) as RoleAbilityRequestDto[];
            request.__projectAbilities = this.policyAbilityFactory.createForUser(
                abilities
            );
        }

        const isAllowed = this.policyAbilityFactory.handlerAbilities(
            request.__projectAbilities,
            requiredAbilities
        );

        if (!isAllowed) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        return true;
    }

    async create(
        tenantId: string,
        dto: ProjectCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {

        const project = await this.projectRepository.create({
            tenantId,
            name: dto.name.trim(),
            status: EnumProjectStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: project.id,
            },
        };
    }

    async getListByTenant(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findWithPaginationOffsetByTenant(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(project => this.projectUtil.mapProject(project)),
        };
    }

    async getOne(
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.projectRepository.findOneById(
            projectId
        );
        return {
            data: this.projectUtil.mapProject(project),
        };
    }

    async update(
        projectId: string,
        dto: ProjectUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {

        const data: {
            name?: string;
            status?: EnumProjectStatus;
            updatedBy: string;
        } = { updatedBy };

        if (dto.name !== undefined) {
            data.name = dto.name.trim();
        }

        if (dto.status !== undefined) {
            data.status = dto.status;
        }

        if (dto.name === undefined && dto.status === undefined) {
            return {};
        }

        await this.projectRepository.update(projectId, data);

        return {};
    }

    async delete(
        projectId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.projectRepository.delete(projectId, deletedBy);

        return {};
    }

    private resolveProjectIdFromRequest(
        request: IRequestAppWithProject
    ): string {
        const key = 'projectId';
        const value = request.params?.[key];
        const projectId = typeof value === 'string' ? value : undefined;

        request.__projectId = projectId;
        return projectId;
    }

}
