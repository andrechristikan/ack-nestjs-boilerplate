import { InvitationProvider } from '@modules/invitation/interfaces/invitation.interface';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { Injectable } from '@nestjs/common';
import {
    EnumRoleScope,
    EnumTenantMemberStatus,
    EnumUserSignUpFrom,
} from '@prisma/client';

@Injectable()
export class TenantInvitationProvider implements InvitationProvider {
    readonly roleScope = EnumRoleScope.tenant;
    readonly invitationType = 'tenant_member' as const;
    readonly signUpFrom = EnumUserSignUpFrom.tenant;

    constructor(private readonly tenantRepository: TenantRepository) {}

    async existsMember(contextId: string, userId: string): Promise<boolean> {
        const member = await this.tenantRepository.existMemberByTenantAndUser(
            contextId,
            userId
        );

        return !!member;
    }

    async addMember(
        contextId: string,
        userId: string,
        roleId: string,
        createdBy: string
    ): Promise<string> {
        const member = await this.tenantRepository.addMember({
            tenantId: contextId,
            userId,
            roleId,
            status: EnumTenantMemberStatus.active,
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
