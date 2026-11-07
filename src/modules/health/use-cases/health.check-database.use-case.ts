import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { HealthDatabaseResponseDto } from '@modules/health/dtos/response/health.database.response.dto';
import { HealthService } from '@modules/health/services/health.service';
import { HealthUtil } from '@modules/health/utils/health.util';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class HealthCheckDatabaseUseCase implements IAppUseCase<
    [],
    IResponseReturn<HealthDatabaseResponseDto>
> {
    constructor(
        private readonly healthService: HealthService,
        private readonly healthUtil: HealthUtil
    ) {}

    async execute(): Promise<IResponseReturn<HealthDatabaseResponseDto>> {
        const result = await this.healthService.checkDatabase();
        const data = this.healthUtil.toResponse(result);

        return { data };
    }
}
