import {
    InviteProvider,
    InviteProviderMember,
} from '@modules/invite/interfaces/invite.interface';
import { InviteProviderRegistry } from '@modules/invite/services/invite-provider.registry';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import {
    ForbiddenException,
    Injectable,
    NotFoundException,
    OnModuleInit,
} from '@nestjs/common';
import {
    EnumInviteType,
    EnumRoleScope,
    EnumTenantMemberStatus,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class TenantInviteProvider implements InviteProvider, OnModuleInit {
    readonly roleScope = EnumRoleScope.tenant;
    readonly invitationType = EnumInviteType.tenantMember;
    readonly signUpFrom = EnumUserSignUpFrom.tenant;

    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly inviteProviderRegistry: InviteProviderRegistry
    ) {}

    onModuleInit(): void {
        this.inviteProviderRegistry.register(this);
    }

    async findMemberByUserId(
        contextId: string,
        userId: string
    ): Promise<InviteProviderMember | null> {
        const member = await this.tenantRepository.findMemberByTenantAndUser(
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
        const member = await this.tenantRepository.createMember({
            tenantId: contextId,
            userId,
            roleId,
            status: EnumTenantMemberStatus.pending,
            createdBy,
            updatedBy: createdBy,
        });

        return member.id;
    }

    async findMemberUserId(
        contextId: string,
        memberId: string
    ): Promise<string | null> {
        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            contextId
        );

        return member?.userId ?? null;
    }

    async getContextName(contextId: string): Promise<string | null> {
        const tenant = await this.tenantRepository.findOneById(contextId);

        return tenant?.name ?? null;
    }

    async activateMemberForInvite(
        contextId: string,
        userId: string,
        memberId: string
    ): Promise<void> {
        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            contextId
        );

        if (!member || member.userId !== userId) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.notFound',
            });
        }

        if (member.status === EnumTenantMemberStatus.active) {
            return;
        }

        if (member.status !== EnumTenantMemberStatus.pending) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        await this.tenantRepository.updateMember(member.id, {
            status: EnumTenantMemberStatus.active,
            updatedBy: userId,
        });
    }
}
