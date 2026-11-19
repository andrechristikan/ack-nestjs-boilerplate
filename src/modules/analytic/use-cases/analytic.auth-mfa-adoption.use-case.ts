import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { AnalyticAuthService } from '@modules/analytic/services/analytic.auth.service';
import type { IAnalyticMfaAdoption } from '@modules/analytic/interfaces/analytic.interface';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class AnalyticAuthMfaAdoptionUseCase implements IAppUseCase<
    [],
    IResponseReturn<IAnalyticMfaAdoption>
> {
    constructor(private readonly analyticAuthService: AnalyticAuthService) {}

    async execute(): Promise<IResponseReturn<IAnalyticMfaAdoption>> {
        const data = await this.analyticAuthService.authMfaAdoption();

        return { data };
    }
}
