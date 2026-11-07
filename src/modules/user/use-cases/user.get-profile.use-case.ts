import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { IUserProfile } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGetProfileUseCase implements IAppUseCase<
    [string],
    IResponseReturn<IUserProfile>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(userId: string): Promise<IResponseReturn<IUserProfile>> {
        const user = await this.userProfileService.getProfile(userId);

        return { data: user };
    }
}
