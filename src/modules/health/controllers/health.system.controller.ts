import { Doc } from '@common/doc/decorators/doc.decorator';
import { Response } from '@common/response/decorators/response.decorator';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    HealthCacheControlHeaderName,
    HealthCacheControlHeaderValue,
} from '@modules/health/constants/health.constant';
import { HealthAwsResponseSchema } from '@modules/health/dtos/response/health.aws.response.dto';
import type { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseSchema } from '@modules/health/dtos/response/health.database.response.dto';
import type { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseSchema } from '@modules/health/dtos/response/health.instance.response.dto';
import type { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseSchema } from '@modules/health/dtos/response/health.third-party.response.dto';
import type { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthHttpService } from '@modules/health/services/health.http.service';
import { Controller, Get, Header, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(private readonly healthHttpService: HealthHttpService) {}

    @Doc({ summary: 'health check api for aws' })
    @Response('health.checkAws', { schema: HealthAwsResponseSchema })
    @Header(HealthCacheControlHeaderName, HealthCacheControlHeaderValue)
    @ApiKeySystemProtected()
    @Get('/aws')
    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        return this.healthHttpService.checkAws();
    }

    @Doc({ summary: 'health check api for database' })
    @Response('health.checkDatabase', { schema: HealthDatabaseResponseSchema })
    @Header(HealthCacheControlHeaderName, HealthCacheControlHeaderValue)
    @ApiKeySystemProtected()
    @Get('/database')
    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        return this.healthHttpService.checkDatabase();
    }

    @Doc({ summary: 'health check api for third party services' })
    @Response('health.checkThirdParty', {
        schema: HealthThirdPartyResponseSchema,
    })
    @Header(HealthCacheControlHeaderName, HealthCacheControlHeaderValue)
    @ApiKeySystemProtected()
    @Get('/third-party')
    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        return this.healthHttpService.checkThirdParty();
    }

    @Doc({ summary: 'health check api for instance' })
    @Response('health.checkInstance', { schema: HealthInstanceResponseSchema })
    @Header(HealthCacheControlHeaderName, HealthCacheControlHeaderValue)
    @ApiKeySystemProtected()
    @Get('/instance')
    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        return this.healthHttpService.checkInstance();
    }
}
