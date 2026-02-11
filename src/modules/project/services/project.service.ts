import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { DatabaseUtil } from '@common/database/utils/database.util';
import {
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { IRequestApp } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { EnumAuthStatusCodeError } from '@modules/auth/enums/auth.status-code.enum';
import { PolicyAbilityFactory } from '@modules/policy/factories/policy.factory';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ProjectCreateRequestDto } from '@modules/project/dtos/request/project.create.request.dto';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectUpdateRequestDto } from '@modules/project/dtos/request/project.update.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { EnumProjectAccessType } from '@modules/project/enums/project.access-type.enum';
import { ProjectRoleViewer } from '@modules/project/constants/project.constant';
import {
    IProject,
    IProjectMember,
} from '@modules/project/interfaces/project.interface';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { RoleAbilityDto } from '@modules/role/dtos/role.ability.dto';
import { RoleAbilityRequestDto } from '@modules/role/dtos/request/role.ability.request.dto';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    EnumRoleScope,
    EnumTenantStatus,
    Project,
} from '@prisma/client';

@Injectable()
export class ProjectService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly tenantRepository: TenantRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly databaseUtil: DatabaseUtil,
        private readonly policyAbilityFactory: PolicyAbilityFactory
    ) {}

    // Tenant-wide actions are authorized by tenant permissions,
    // while project-resource actions are validated by project member permissions.

    async validateProjectMemberGuard(request: IRequestApp): Promise<IProjectMember> {
        const { user } = request;
        if (!user) {
            throw new ForbiddenException({
                statusCode: EnumAuthStatusCodeError.jwtAccessTokenInvalid,
                message: 'auth.error.accessTokenUnauthorized',
            });
        }

        const projectId = request.params?.projectId;
        if (!this.databaseUtil.checkIdIsValid(projectId)) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'project.error.projectIdInvalid',
            });
        }

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

        const abilities = (projectMember.role.abilities ?? []) as unknown as RoleAbilityDto[];
        request.__abilities = abilities;

        return projectMember;
    }

    async validateProjectPermissionGuard(
        request: IRequestApp,
        requiredAbilities: RoleAbilityRequestDto[]
    ): Promise<boolean> {
        if (requiredAbilities.length === 0) {
            throw new InternalServerErrorException({
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                message: 'policy.error.predefinedNotFound',
            });
        }

        const abilities =
            request.__abilities ??
            ((request.__projectMember?.role?.abilities ?? []) as unknown as RoleAbilityRequestDto[]);
        const userAbilities = this.policyAbilityFactory.createForUser(
            abilities as RoleAbilityRequestDto[]
        );
        const isAllowed = this.policyAbilityFactory.handlerAbilities(
            userAbilities,
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
        await this.assertTenantExistsAndActive(tenantId);

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
        await this.assertTenantExists(tenantId);

        const { data, ...others } =
            await this.projectRepository.findWithPaginationOffsetByTenant(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(project => this.mapProject(project)),
        };
    }

    async getOneByTenant(
        tenantId: string,
        projectId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        const project = await this.assertProjectExists(tenantId, projectId);

        return {
            data: this.mapProject(project),
        };
    }

    async updateByTenant(
        tenantId: string,
        projectId: string,
        dto: ProjectUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertProjectExists(tenantId, projectId);

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

    async deleteByTenant(
        tenantId: string,
        projectId: string,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        await this.assertProjectExists(tenantId, projectId);

        await this.projectRepository.update(projectId, {
            status: EnumProjectStatus.inactive,
            updatedBy,
        });

        return {};
    }

    async addProjectMember(
        tenantId: string,
        projectId: string,
        dto: ProjectMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        await this.assertProjectExists(tenantId, projectId);

        if (!this.databaseUtil.checkIdIsValid(dto.userId)) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'projectMember.error.userIdInvalid',
            });
        }

        const [user, member] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.projectRepository.findMemberByProjectAndUser(
                projectId,
                dto.userId
            ),
        ]);

        if (!user) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'projectMember.error.userNotFound',
            });
        }

        if (member) {
            throw new ConflictException({
                statusCode: HttpStatus.CONFLICT,
                message: 'projectMember.error.exist',
            });
        }

        const role = await this.resolveProjectRoleByName(ProjectRoleViewer);

        const projectMember = await this.projectRepository.addMember({
            projectId,
            userId: dto.userId,
            roleId: role.id,
            status: EnumProjectMemberStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: projectMember.id,
            },
        };
    }

    async listProjectMembers(
        tenantId: string,
        projectId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        await this.assertProjectExists(tenantId, projectId);

        const { data, ...others } =
            await this.projectRepository.findMembersWithPaginationOffsetByProject(
                projectId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => this.mapMember(member)),
        };
    }

    async listMemberProjects(
        userId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectAccessResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findMembersWithPaginationOffsetByUser(
                userId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => ({
                accessType: EnumProjectAccessType.member,
                project: this.mapProject(member.project as Project),
            })),
        };
    }

    async getMemberProjectById(
        projectId: string,
        userId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {
        if (!this.databaseUtil.checkIdIsValid(projectId)) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'project.error.projectIdInvalid',
            });
        }

        const member = await this.projectRepository.findMemberByProjectAndUser(
            projectId,
            userId,
            EnumProjectMemberStatus.active
        );

        if (!member?.project) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        if (member.project.status !== EnumProjectStatus.active) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        return {
            data: this.mapProject(member.project as Project),
        };
    }

    private async assertTenantExists(id: string) {
        if (!this.databaseUtil.checkIdIsValid(id)) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'tenant.error.xTenantIdInvalid',
            });
        }

        const tenant = await this.tenantRepository.findOneById(id);
        if (!tenant) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'tenant.error.notFound',
            });
        }

        return tenant;
    }

    private async assertTenantExistsAndActive(id: string) {
        const tenant = await this.assertTenantExists(id);
        if (tenant.status !== EnumTenantStatus.active) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'tenant.error.inactive',
            });
        }

        return tenant;
    }

    private async assertProjectExists(
        tenantId: string,
        projectId: string
    ): Promise<Project> {
        if (!this.databaseUtil.checkIdIsValid(projectId)) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'project.error.projectIdInvalid',
            });
        }

        const project = await this.projectRepository.findOneByIdAndTenant(
            projectId,
            tenantId
        );
        if (!project) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'project.error.notFound',
            });
        }

        return project;
    }

    private mapProject(project: IProject): ProjectResponseDto {
        return {
            id: project.id,
            tenantId: project.tenantId,
            name: project.name,
            status: project.status,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
        };
    }

    private mapMember(member: IProjectMember): ProjectMemberResponseDto {
        return {
            id: member.id,
            projectId: member.projectId,
            userId: member.userId,
            roleName: member.role?.name ?? ProjectRoleViewer,
            status: member.status,
            createdAt: member.createdAt,
        };
    }

    private async resolveProjectRoleByName(roleName: string) {
        const roleInProjectScope = await this.roleRepository.existByNameAndScope(
            roleName,
            EnumRoleScope.project
        );

        if (roleInProjectScope) {
            return roleInProjectScope;
        }

        const role = await this.roleRepository.existByName(roleName);
        if (role && role.scope !== EnumRoleScope.project) {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: 'projectRole.error.scopeMismatch',
            });
        }

        if (!role) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'projectRole.error.notFound',
            });
        }

        return role;
    }
}
