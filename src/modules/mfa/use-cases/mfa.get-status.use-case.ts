import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { MfaStatusResponseDto } from '@modules/mfa/dtos/response/mfa.status.response.dto';
import { MfaService } from '@modules/mfa/services/mfa.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class MfaGetStatusUseCase implements IAppUseCase<
    [IAuthJwtAccessContext],
    IResponseReturn<MfaStatusResponseDto>
> {
    constructor(private readonly mfaService: MfaService) {}

    async execute(
        authContext: IAuthJwtAccessContext
    ): Promise<IResponseReturn<MfaStatusResponseDto>> {
        const status = await this.mfaService.getStatus(authContext.userId);

        return { data: status };
    }
}
