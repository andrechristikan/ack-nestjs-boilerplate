import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthInstanceResponseDto } from '@modules/health/dtos/response/health.instance.response.dto';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class HealthCheckInstanceUseCase implements IAppUseCase<
    [],
    IResponseReturn<HealthInstanceResponseDto>
> {
    constructor(
        private readonly healthService: HealthService,
        private readonly healthUtil: HealthUtil
    ) {}

    async execute(): Promise<IResponseReturn<HealthInstanceResponseDto>> {
        const result = await this.healthService.checkInstance();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }
}
