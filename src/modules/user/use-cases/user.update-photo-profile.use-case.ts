import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserUpdateProfilePhotoRequestDto } from '@modules/user/dtos/request/user.update-profile-photo.request.dto';
import type { IUserContext } from '@modules/user/interfaces/user.interface';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserUpdatePhotoProfileUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        IUserContext,
        UserUpdateProfilePhotoRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { user }: IUserContext,
        { key }: UserUpdateProfilePhotoRequestDto
    ): Promise<IResponseReturn<void>> {
        const check = await this.userProfileService.checkPhotoProfile(
            authContext,
            { key }
        );

        try {
            const isRejected =
                this.userProfileService.isPhotoProfileRejected(check);
            if (isRejected) {
                await this.databaseService.withTransaction(async tx =>
                    this.userProfileService.deleteRejectedPhotoInTx(
                        tx,
                        authContext.userId,
                        check.photo
                    )
                );
            }
            this.userProfileService.assertPhotoSizeAllowed(check);
            this.userProfileService.assertPhotoContentValid(check);

            await this.databaseService.withTransaction(async tx =>
                this.userProfileService.replacePhotoProfileInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    user.photo,
                    check.photo
                )
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
