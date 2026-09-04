import { Response } from '@common/response/decorators/response.decorator';
import { IResponseReturn } from '@common/response/interfaces/response.interface';
import { ApiKeySystemProtected } from '@modules/api-key/decorators/api-key.decorator';
import {
    HealthSystemCheckAwsDoc,
    HealthSystemCheckDatabaseDoc,
    HealthSystemCheckInstanceDoc,
    HealthSystemCheckThirdPartyDoc,
} from '@modules/health/docs/health.system.doc';
import { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthHttpService } from '@modules/health/services/health.http.service';
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';

@ApiTags('modules.system.health')
@Controller({
    version: VERSION_NEUTRAL,
    path: '/health',
})
export class HealthSystemController {
    constructor(private readonly healthHttpService: HealthHttpService) {}

    @HealthSystemCheckAwsDoc()
    @Response('health.checkAws')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/aws')
    async checkAws(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        return this.healthHttpService.checkAws();
    }

    @HealthSystemCheckDatabaseDoc()
    @Response('health.checkDatabase')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/database')
    async checkDatabase(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        return this.healthHttpService.checkDatabase();
    }

    @HealthSystemCheckThirdPartyDoc()
    @Response('health.checkThirdParty')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/third-party')
    async checkThirdParty(): Promise<
        IResponseReturn<HealthThirdPartyResponseDto>
    > {
        return this.healthHttpService.checkThirdParty();
    }

    @HealthSystemCheckInstanceDoc()
    @Response('health.checkInstance')
    @HealthCheck()
    @ApiKeySystemProtected()
    @Get('/instance')
    async checkInstance(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        return this.healthHttpService.checkInstance();
    }
}
