import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyActiveDto } from 'src/common/api-key/dtos/api-key.active.dto';
import {
    ApiKeyCreateDto,
    ApiKeyCreateRawDto,
} from 'src/common/api-key/dtos/api-key.create.dto';
import { ApiKeyResetDto } from 'src/common/api-key/dtos/api-key.reset.dto';
import { IApiKeyEntity } from 'src/common/api-key/interfaces/api-key.interface';
import { ApiKeyEntity } from 'src/common/api-key/repository/entities/api-key.entity';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';

@Injectable()
export class ApiKeyUseCase {
    private readonly env: string;

    constructor(
        private readonly helperStringService: HelperStringService,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService
    ) {
        this.env = this.configService.get<string>('app.env');
    }

    async active(): Promise<ApiKeyActiveDto> {
        const dto: ApiKeyActiveDto = new ApiKeyActiveDto();
        dto.isActive = true;

        return dto;
    }

    async inactive(): Promise<ApiKeyActiveDto> {
        const dto: ApiKeyActiveDto = new ApiKeyActiveDto();
        dto.isActive = false;

        return dto;
    }

    async create({
        name,
        description,
    }: ApiKeyCreateDto): Promise<IApiKeyEntity> {
        const key = this.createKey();
        const secret = this.createSecret();
        const hash: string = this.createHashApiKey(key, secret);

        const dto: ApiKeyEntity = new ApiKeyEntity();
        dto.name = name;
        dto.description = description;
        dto.key = key;
        dto.hash = hash;
        dto.isActive = true;

        return { ...dto, secret };
    }

    async createRaw({
        name,
        description,
        key,
        secret,
    }: ApiKeyCreateRawDto): Promise<IApiKeyEntity> {
        const hash: string = this.createHashApiKey(key, secret);

        const dto: ApiKeyEntity = new ApiKeyEntity();
        dto.name = name;
        dto.description = description;
        dto.key = key;
        dto.hash = hash;
        dto.isActive = true;

        return { ...dto, secret };
    }

    async reset(apiKey: ApiKeyEntity): Promise<ApiKeyResetDto> {
        const secret: string = this.createSecret();
        const hash: string = this.createHashApiKey(apiKey.key, secret);

        const dto: ApiKeyResetDto = new ApiKeyResetDto();
        dto.hash = hash;
        dto.secret = secret;

        return dto;
    }

    createKey(): string {
        return this.helperStringService.random(25, {
            safe: false,
            upperCase: true,
            prefix: `${this.env}_`,
        });
    }

    createSecret(): string {
        return this.helperStringService.random(35, {
            safe: false,
            upperCase: true,
        });
    }

    createHashApiKey(key: string, secret: string): string {
        return this.helperHashService.sha256(`${key}:${secret}`);
    }
}
