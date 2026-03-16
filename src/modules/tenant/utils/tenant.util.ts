import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { TenantResponseDto } from '@modules/tenant/dtos/response/tenant.response.dto';
import { ITenant, ITenantMember } from '@modules/tenant/interfaces/tenant.interface';

@Injectable()
export class TenantUtil {
    mapTenant(tenant: ITenant): TenantResponseDto {
        return plainToInstance(TenantResponseDto, tenant);
    }

    mapMember(member: ITenantMember): TenantMemberResponseDto {
        return plainToInstance(TenantMemberResponseDto, member);
    }
}
