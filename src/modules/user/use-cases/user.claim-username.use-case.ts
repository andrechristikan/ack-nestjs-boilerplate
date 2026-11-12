import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserClaimUsernameUseCase implements IAppUseCase<
    [IRequestContextUser, UserClaimUsernameRequestDto],
    IResponseReturn<void>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        context: IRequestContextUser,
        { username }: UserClaimUsernameRequestDto
    ): Promise<IResponseReturn<void>> {
        await this.userProfileService.claimUsername(context.snapshot, username);

        return {};
    }
}
