import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthThirdPartyResponseDto } from '@modules/health/dtos/response/health.third-party.response.dto';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class HealthCheckThirdPartyUseCase implements IAppUseCase<
    [],
    IResponseReturn<HealthThirdPartyResponseDto>
> {
    constructor(
        private readonly healthService: HealthService,
        private readonly healthUtil: HealthUtil
    ) {}

    async execute(): Promise<IResponseReturn<HealthThirdPartyResponseDto>> {
        const result = await this.healthService.checkThirdParty();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }
}
