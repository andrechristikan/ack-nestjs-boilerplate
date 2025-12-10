import { DatabaseService } from '@common/database/services/database.service';
import { EnumPaginationOrderDirectionType } from '@common/pagination/enums/pagination.enum';
import {
    IPaginationEqual,
    IPaginationIn,
    IPaginationQueryOffsetParams,
} from '@common/pagination/interfaces/pagination.interface';
import { PaginationService } from '@common/pagination/services/pagination.service';
import { IResponsePagingReturn } from '@common/response/interfaces/response.interface';
import { ApiKeyCreateRequestDto } from '@modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateDateRequestDto } from '@modules/api-key/dtos/request/api-key.update-date.request.dto';
import { ApiKeyUpdateStatusRequestDto } from '@modules/api-key/dtos/request/api-key.update-status.request.dto';
import { Injectable } from '@nestjs/common';
import { ApiKey } from '@prisma/client';

@Injectable()
export class ApiKeyRepository {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly paginationService: PaginationService
    ) {}

    async findWithPagination(
        { where, ...params }: IPaginationQueryOffsetParams,
        isActive?: Record<string, IPaginationEqual>,
        type?: Record<string, IPaginationIn>
    ): Promise<IResponsePagingReturn<ApiKey>> {
        return this.paginationService.offset<ApiKey>(
            this.databaseService.apiKey,
            {
                ...params,
                where: {
                    ...where,
                    ...isActive,
                    ...type,
                },
                orderBy: {
                    createdAt: EnumPaginationOrderDirectionType.desc,
                },
            }
        );
    }

    async create(
        { name, type, startAt, endAt }: ApiKeyCreateRequestDto,
        key: string,
        hash: string
    ): Promise<ApiKey> {
        return this.databaseService.apiKey.create({
            data: {
                name,
                key,
                hash,
                isActive: true,
                type,
                startAt,
                endAt,
            },
        });
    }

    async findOneById(id: string): Promise<ApiKey | null> {
        return this.databaseService.apiKey.findUnique({
            where: {
                id,
            },
        });
    }

    async updateStatus(
        id: string,
        { isActive }: ApiKeyUpdateStatusRequestDto
    ): Promise<ApiKey> {
        return this.databaseService.apiKey.update({
            where: {
                id,
            },
            data: {
                isActive,
            },
        });
    }

    async updateName(id: string, name: string): Promise<ApiKey> {
        return this.databaseService.apiKey.update({
            where: {
                id,
            },
            data: {
                name,
            },
        });
    }

    async updateDates(
        id: string,
        { startAt, endAt }: ApiKeyUpdateDateRequestDto
    ): Promise<ApiKey> {
        return this.databaseService.apiKey.update({
            where: {
                id,
            },
            data: {
                startAt,
                endAt,
            },
        });
    }

    async updateHash(id: string, hash: string): Promise<ApiKey> {
        return this.databaseService.apiKey.update({
            where: {
                id,
            },
            data: {
                hash,
            },
        });
    }

    async delete(id: string): Promise<ApiKey> {
        return this.databaseService.apiKey.delete({
            where: {
                id,
            },
        });
    }

    async findOneByKey(key: string): Promise<ApiKey | null> {
        return this.databaseService.apiKey.findUnique({
            where: {
                key,
            },
        });
    }
}
