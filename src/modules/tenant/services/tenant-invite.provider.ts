import {
    InviteProvider,
    InviteProviderMember,
} from '@modules/invite/interfaces/invite.interface';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumInviteType,
    EnumRoleScope,
    EnumTenantMemberStatus,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class TenantInviteProvider implements InviteProvider {
    readonly roleScope = EnumRoleScope.tenant;
    readonly invitationType = EnumInviteType.tenantMember;
    readonly signUpFrom = EnumUserSignUpFrom.tenant;

    constructor(private readonly tenantRepository: TenantRepository) {}

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
}
