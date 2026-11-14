import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserGeneratePhotoProfilePresignUseCase implements IAppUseCase<
    [IAuthJwtAccessContext, UserGeneratePhotoProfileRequestDto],
    IResponseReturn<IAwsS3Presign>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        authContext: IAuthJwtAccessContext,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.userProfileService.generatePhotoProfilePresign(
                authContext.userId,
                {
                    extension,
                    size,
                }
            );

        return { data: presign };
    }
}
