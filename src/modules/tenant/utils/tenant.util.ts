import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { ITenant, ITenantMember } from '@modules/tenant/interfaces/tenant.interface';

@Injectable()
export class TenantUtil {
    createSlug(value: string): string {
        const normalized = value
            .trim()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[^\w\s-]/g, '')
            .replace(/_/g, '-')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');

        return normalized || 'tenant';
    }

    mapTenant(tenant: ITenant): TenantResponseDto {
        return plainToInstance(TenantResponseDto, tenant);
    }

    mapMember(member: ITenantMember): TenantMemberResponseDto {
        return plainToInstance(TenantMemberResponseDto, member);
    }
}
