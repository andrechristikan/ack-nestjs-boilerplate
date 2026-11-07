import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthAwsResponseDto } from '@modules/health/dtos/response/health.aws.response.dto';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class HealthCheckAwsUseCase implements IAppUseCase<
    [],
    IResponseReturn<HealthAwsResponseDto>
> {
    constructor(
        private readonly healthService: HealthService,
        private readonly healthUtil: HealthUtil
    ) {}

    async execute(): Promise<IResponseReturn<HealthAwsResponseDto>> {
        const result = await this.healthService.checkAws();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }
}
