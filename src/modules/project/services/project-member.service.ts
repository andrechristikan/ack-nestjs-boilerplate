import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    ConflictException,
    ForbiddenException,
    HttpStatus,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumProjectMemberStatus,
    EnumProjectStatus,
    EnumRoleScope,
} from '@prisma/client';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly roleRepository: RoleRepository,
        private readonly userRepository: UserRepository,
        private readonly projectUtil: ProjectUtil
    ) {}

    async create(
        projectId: string,
        dto: ProjectMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
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

        const role = await this.resolveProjectRoleByName(dto.roleName);

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

    async update(
        projectId: string,
        memberId: string,
        dto: ProjectMemberUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {

        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            projectId
        );
        if (!member) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'projectMember.error.forbidden',
            });
        }

        let roleId: string | undefined;
        if (dto.roleName !== undefined) {
            const role = await this.resolveProjectRoleByName(dto.roleName);
            roleId = role.id;
        }

        if (dto.status === undefined && roleId === undefined) {
            return {};
        }

        await this.projectRepository.updateMember(member.id, {
            roleId,
            status: dto.status,
            updatedBy,
        });

        return {};
    }

    async listMembers(
        projectId: string,
        pagination: IPaginationQueryOffsetParams
    ): Promise<IResponsePagingReturn<ProjectMemberResponseDto>> {
        const { data, ...others } =
            await this.projectRepository.findMembersWithPaginationOffsetByProject(
                projectId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => this.projectUtil.mapMember(member)),
        };
    }

    async list(
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
            data: data.map(member =>
                this.projectUtil.mapMemberProjectAccess(member.project)
            ),
        };
    }

    async getOne(
        projectId: string,
        userId: string
    ): Promise<IResponseReturn<ProjectResponseDto>> {

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
            data: this.projectUtil.mapProject(member.project),
        };
    }

    private async resolveProjectRoleByName(roleName: string): Promise<{ id: string }> {
        const role = await this.roleRepository.existByNameAndScope(
            roleName.trim(),
            EnumRoleScope.project
        );
        if (!role) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'projectRole.error.notFound',
            });
        }

        return { id: role.id };
    }
}
