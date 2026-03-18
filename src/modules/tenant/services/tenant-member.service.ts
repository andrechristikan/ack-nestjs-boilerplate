import { DatabaseIdDto } from '@common/database/dtos/database.id.dto';
import { ITenantMemberService } from '@modules/tenant/interfaces/tenant-member.service.interface';
import { IPaginationQueryOffsetParams } from '@common/pagination/interfaces/pagination.interface';
import { Prisma } from '@generated/prisma-client';
import {
    IResponsePagingReturn,
    IResponseReturn,
} from '@common/response/interfaces/response.interface';
import { TenantMemberCreateRequestDto } from '@modules/tenant/dtos/request/tenant.member.create.request.dto';
import { TenantMemberUpdateRequestDto } from '@modules/tenant/dtos/request/tenant.member.update.request.dto';
import { TenantMemberResponseDto } from '@modules/tenant/dtos/response/tenant.member.response.dto';
import { EnumTenantStatusCodeError } from '@modules/tenant/enums/tenant.status-code.enum';
import { TenantRepository } from '@modules/tenant/repositories/tenant.repository';
import { TenantUtil } from '@modules/tenant/utils/tenant.util';
import { UserRepository } from '@modules/user/repositories/user.repository';
import {
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import {
    EnumTenantMemberRole,
    EnumTenantMemberStatus,
} from '@generated/prisma-client';

@Injectable()
export class TenantMemberService implements ITenantMemberService {
    constructor(
        private readonly tenantRepository: TenantRepository,
        private readonly userRepository: UserRepository,
        private readonly tenantUtil: TenantUtil
    ) {}

    async createMember(
        tenantId: string,
        dto: TenantMemberCreateRequestDto,
        createdBy: string
    ): Promise<IResponseReturn<DatabaseIdDto>> {
        const [user, memberExist] = await Promise.all([
            this.userRepository.findOneById(dto.userId),
            this.tenantRepository.existMemberByTenantAndUser(
                tenantId,
                dto.userId,
                EnumTenantMemberStatus.active
            ),
        ]);

        if (!user) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.userNotFound',
            });
        }

        if (memberExist) {
            throw new ConflictException({
                statusCode: EnumTenantStatusCodeError.memberExist,
                message: 'tenant.member.error.exist',
            });
        }

        if (dto.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        const member = await this.tenantRepository.createMember({
            tenantId,
            userId: dto.userId,
            role: dto.role,
            status: EnumTenantMemberStatus.active,
            createdBy,
            updatedBy: createdBy,
        });

        return {
            data: {
                id: member.id,
            },
        };
    }

    async updateMember(
        tenantId: string,
        memberId: string,
        dto: TenantMemberUpdateRequestDto,
        updatedBy: string
    ): Promise<IResponseReturn<void>> {
        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            tenantId
        );

        if (!member) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.notFound',
            });
        }

        if (dto.status === undefined && dto.role === undefined) {
            return {};
        }

        if (member.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        if (dto.role === EnumTenantMemberRole.owner) {
            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        await this.tenantRepository.updateMember(member.id, {
            role: dto.role,
            status: dto.status,
            updatedBy,
        });

        return {};
    }

    async deleteMember(
        tenantId: string,
        memberId: string,
        deletedBy: string
    ): Promise<IResponseReturn<void>> {
        const member = await this.tenantRepository.findOneMemberByIdAndTenant(
            memberId,
            tenantId
        );

        if (!member) {
            throw new NotFoundException({
                statusCode: EnumTenantStatusCodeError.memberNotFound,
                message: 'tenant.member.error.notFound',
            });
        }

        if (member.role === EnumTenantMemberRole.owner) {
            if (member.userId !== deletedBy) {
                throw new ForbiddenException({
                    statusCode: EnumTenantStatusCodeError.memberForbidden,
                    message: 'tenant.member.error.forbidden',
                });
            }

            const activeMemberCount =
                await this.tenantRepository.countActiveMembersByTenant(
                    tenantId
                );
            if (activeMemberCount <= 1) {
                await this.tenantRepository.deleteTenantAndMember(
                    tenantId,
                    member.id,
                    deletedBy
                );
                return {};
            }

            throw new ForbiddenException({
                statusCode: EnumTenantStatusCodeError.memberForbidden,
                message: 'tenant.member.error.forbidden',
            });
        }

        await this.tenantRepository.deleteMember(member.id);

        return {};
    }

    async getMembersOffset(
        tenantId: string,
        pagination: IPaginationQueryOffsetParams<
            Prisma.TenantMemberSelect,
            Prisma.TenantMemberWhereInput
        >
    ): Promise<IResponsePagingReturn<TenantMemberResponseDto>> {
        const { data, ...others } =
            await this.tenantRepository.findMembersWithPaginationOffset(
                tenantId,
                pagination
            );

        return {
            ...others,
            data: data.map(member => this.tenantUtil.mapMember(member)),
        };
    }
}
