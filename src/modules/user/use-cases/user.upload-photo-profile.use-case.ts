import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IFile } from '@common/file/interfaces/file.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserUploadPhotoProfileUseCase implements IAppUseCase<
    [string, IFile, IRequestContext],
    IResponseReturn<void>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        userId: string,
        file: IFile,
        context: IRequestContext
    ): Promise<IResponseReturn<void>> {
        await this.userProfileService.uploadPhotoProfile(userId, file, context);

        return {};
    }
}
