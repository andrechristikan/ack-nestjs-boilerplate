import type { IRequestContextUser } from '@common/request/interfaces/request.interface';
import type { IAwsS3Presign } from '@common/aws/interfaces/aws.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserGeneratePhotoProfileRequestDto } from '@modules/user/dtos/request/user.generate-photo-profile.request.dto';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';

@Injectable()
export class UserGeneratePhotoProfilePresignUseCase implements IAppUseCase<
    [IRequestContextUser, UserGeneratePhotoProfileRequestDto],
    IResponseReturn<IAwsS3Presign>
> {
    constructor(private readonly userProfileService: UserProfileService) {}

    async execute(
        context: IRequestContextUser,
        { extension, size }: UserGeneratePhotoProfileRequestDto
    ): Promise<IResponseReturn<IAwsS3Presign>> {
        const presign =
            await this.userProfileService.generatePhotoProfilePresign(
                context.user.id,
                {
                    extension,
                    size,
                }
            );

        return { data: presign };
    }
}
