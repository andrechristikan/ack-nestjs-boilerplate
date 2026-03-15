import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TenantJitAccessResponseDto } from '@modules/tenant/dtos/response/tenant.jit-access.response.dto';
import { TenantMembershipDto } from '@modules/tenant/dtos/response/tenant.login.response.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import {
    ITenant,
    ITenantMember,
    ITenantMemberWithTenant,
} from '@modules/tenant/interfaces/tenant.interface';
import { TenantMember } from '@generated/prisma-client';

@Injectable()
export class TenantUtil {
    mapTenant(tenant: ITenant): TenantResponseDto {
        return plainToInstance(TenantResponseDto, tenant);
    }

    mapMember(member: ITenantMember): TenantMemberResponseDto {
        return plainToInstance(TenantMemberResponseDto, member);
    }

    mapMembership(membership: ITenantMemberWithTenant): TenantMembershipDto {
        return plainToInstance(TenantMembershipDto, {
            tenantId: membership.tenantId,
            tenantName: membership.tenant.name,
            role: membership.role,
            status: membership.status,
        });
    }

    mapJitAccess(
        member: TenantMember,
        tenant: ITenant,
        expiresAt: Date,
        reason: string
    ): TenantJitAccessResponseDto {
        return plainToInstance(TenantJitAccessResponseDto, {
            memberId: member.id,
            tenantId: tenant.id,
            tenantName: tenant.name,
            role: member.role,
            expiresAt,
            reason,
        });
    }
}
