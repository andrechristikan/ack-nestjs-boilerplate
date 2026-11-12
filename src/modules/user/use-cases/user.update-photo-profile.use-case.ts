import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUpdatePhotoProfileUseCase implements IAppUseCase<
    [string, UserUpdateProfilePhotoRequestDto, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        userId: string,
        { key }: UserUpdateProfilePhotoRequestDto,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.userProfileService.updatePhotoProfile(
            userId,
            { key },
            context
        );

        return {};
    }
}
