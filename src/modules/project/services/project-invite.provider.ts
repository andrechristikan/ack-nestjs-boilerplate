import {
    InviteProvider,
    InviteProviderMember,
} from '@modules/invite/interfaces/invite.interface';
import { InviteProviderRegistry } from '@modules/invite/services/invite-provider.registry';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import {
    ForbiddenException,
    HttpStatus,
    Injectable,
    OnModuleInit,
} from '@nestjs/common';
import {
    EnumInviteType,
    EnumProjectMemberStatus,
    EnumRoleScope,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class ProjectInviteProvider implements InviteProvider, OnModuleInit {
    readonly roleScope: EnumRoleScope = EnumRoleScope.project;
    readonly invitationType = EnumInviteType.projectMember;
    readonly signUpFrom: EnumUserSignUpFrom = EnumUserSignUpFrom.project;

    constructor(
        private readonly projectRepository: ProjectRepository,
        private readonly inviteProviderRegistry: InviteProviderRegistry
    ) {}

    onModuleInit(): void {
        this.inviteProviderRegistry.register(this);
    }

    async findMemberByUserId(
        contextId: string,
        userId: string
    ): Promise<InviteProviderMember | null> {
        const member = await this.projectRepository.findMemberByProjectAndUser(
            contextId,
            userId
        );

        if (!member) {
            return null;
        }

        return {
            id: member.id,
            status: member.status,
        };
    }

    async createMember(
        contextId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<string> {
        const member = await this.projectRepository.createMember({
            projectId: contextId,
            userId,
            roleId,
            status: EnumProjectMemberStatus.pending,
            createdBy,
            updatedBy: createdBy,
        });

        return member.id;
    }

    async findMemberUserId(
        contextId: string,
        memberId: string
    ): Promise<string | null> {
        const member = await this.projectRepository.findOneMemberByIdAndProject(
            memberId,
            contextId
        );

        return member?.user?.id ?? null;
    }

    async getContextName(contextId: string): Promise<string | null> {
        const project = await this.projectRepository.findOneById(contextId);

        return project?.name ?? null;
    }

    async activateMemberForInvite(
        contextId: string,
        userId: string,
        memberId?: string
    ): Promise<void> {
        if (memberId) {
            const member =
                await this.projectRepository.findOneMemberByIdAndProject(
                    memberId,
                    contextId
                );

            if (!member || member.user?.id !== userId) {
                throw new ForbiddenException({
                    statusCode: HttpStatus.FORBIDDEN,
                    message: 'project.member.error.forbidden',
                });
            }

            if (member.status === EnumProjectMemberStatus.active) {
                return;
            }

            if (member.status !== EnumProjectMemberStatus.pending) {
                throw new ForbiddenException({
                    statusCode: HttpStatus.FORBIDDEN,
                    message: 'project.member.error.forbidden',
                });
            }

            await this.projectRepository.updateMember(member.id, {
                status: EnumProjectMemberStatus.active,
                updatedBy: userId,
            });

            return;
        }

        const member = await this.projectRepository.findMemberByProjectAndUser(
            contextId,
            userId
        );
        if (!member) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        if (member.status === EnumProjectMemberStatus.active) {
            return;
        }

        if (member.status !== EnumProjectMemberStatus.pending) {
            throw new ForbiddenException({
                statusCode: HttpStatus.FORBIDDEN,
                message: 'project.member.error.forbidden',
            });
        }

        await this.projectRepository.updateMember(member.id, {
            status: EnumProjectMemberStatus.active,
            updatedBy: userId,
        });
    }
}
