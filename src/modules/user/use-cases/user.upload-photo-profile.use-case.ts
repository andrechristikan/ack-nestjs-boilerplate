import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IFile } from '@common/file/interfaces/file.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUploadPhotoProfileUseCase implements IAppUseCase<
    [IRequestContextUser, IFile],
    IResponseReturn<void>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        context: IRequestContextUser,
        file: IFile
    ): Promise<IResponseReturn<void>> {
        await this.userProfileService.uploadPhotoProfile(
            context.snapshot,
            file
        );

        return {};
    }
}
