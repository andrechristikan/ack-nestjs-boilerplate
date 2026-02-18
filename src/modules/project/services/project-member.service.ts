import { EnumAppStatusCodeError } from '@app/enums/app.status-code.enum';
import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { InvitationService } from '@modules/invitation/services/invitation.service';
import { RoleListResponseDto } from '@modules/role/dtos/response/role.list.response.dto';
import { RoleService } from '@modules/role/services/role.service';
import { RoleRepository } from '@modules/role/repositories/role.repository';
import { ProjectMemberCreateRequestDto } from '@modules/project/dtos/request/project-member.create.request.dto';
import { InvitationCreateRequestDto } from '@modules/invitation/dtos/request/invitation.create.request.dto';
import { InvitationCreateResponseDto } from '@modules/invitation/dtos/response/invitation-create.response.dto';
import { InvitationSendResponseDto } from '@modules/invitation/dtos/response/invitation-send.response.dto';
import { ProjectMemberUpdateRequestDto } from '@modules/project/dtos/request/project-member.update.request.dto';
import { ProjectAccessResponseDto } from '@modules/project/dtos/response/project.access.response.dto';
import { ProjectMemberResponseDto } from '@modules/project/dtos/response/project-member.response.dto';
import { ProjectResponseDto } from '@modules/project/dtos/response/project.response.dto';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectInvitationProvider } from '@modules/project/services/project-invitation.provider';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
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
    EnumRoleType,
} from '@prisma/client';

@Injectable()
export class ProjectMemberService {
    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly roleRepository: RoleRepository,
        private readonly roleService: RoleService,
        private readonly userRepository: UserRepository,
        private readonly invitationService: InvitationService,
        private readonly projectUtil: ProjectUtil,
        private readonly projectInvitationProvider: ProjectInvitationProvider
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

        const role = await this.roleRepository.existByNameAndScope(
            dto.roleName.trim(),
            this.projectInvitationProvider.roleScope
        );
        if (!role) {
            throw new NotFoundException({
                statusCode: HttpStatus.NOT_FOUND,
                message: 'projectRole.error.notFound',
            });
        }

        try {
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
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
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
        if (dto.roleId) {
            const role = await this.roleRepository.existById(dto.roleId);
            if (!role) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'projectRole.error.notFound',
                });
            }

            if (role.scope !== this.projectInvitationProvider.roleScope) {
                throw new NotFoundException({
                    statusCode: HttpStatus.NOT_FOUND,
                    message: 'projectRole.error.notFound',
                });
            }

            roleId = role.id;
        }

        if (dto.status === undefined && roleId === undefined) {
            return {};
        }

        try {
            await this.projectRepository.updateMember(member.id, {
                roleId,
                status: dto.status,
                updatedBy,
            });

            return {};
        } catch (err: unknown) {
            throw new InternalServerErrorException({
                statusCode: EnumAppStatusCodeError.unknown,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    async createInvitation(
        projectId: string,
        dto: InvitationCreateRequestDto,
        createdBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InvitationCreateResponseDto>> {
        return this.invitationService.createInvitation(
            projectId,
            dto,
            this.projectInvitationProvider,
            requestLog,
            createdBy
        );
    }

    async sendInvitation(
        projectId: string,
        memberId: string,
        requestedBy: string,
        requestLog: IRequestLog
    ): Promise<IResponseReturn<InvitationSendResponseDto>> {
        return this.invitationService.sendInvitation(
            projectId,
            memberId,
            this.projectInvitationProvider,
            requestLog,
            requestedBy
        );
    }

    async getMemberRoles(projectId: string): Promise<
        IResponseReturn<RoleListResponseDto[]>
    > {
        void projectId;

        return this.roleService.getListRolesByScopeAndType(
            EnumRoleScope.project,
            EnumRoleType.user
        );
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
            data: data.map(member =>
                this.projectUtil.mapMember(
                    member,
                    this.invitationService.mapInvitationStatus(
                        member.user.isVerified,
                        member.user.verifiedAt,
                        member.user.verifications[0]
                    )
                )
            ),
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

        if (!member) {
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
}
