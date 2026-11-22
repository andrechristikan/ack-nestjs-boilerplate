import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IFile } from '@common/file/interfaces/file.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserUploadPhotoProfileUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, IAuthJwtAccessContext, IFile],
    IResponseReturn<void>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        file: IFile
    ): Promise<IResponseReturn<void>> {
        await this.userProfileService.uploadPhotoProfile(
            requestContext,
            apiKeyContext,
            authContext,
            file
        );

        return {};
    }
}
