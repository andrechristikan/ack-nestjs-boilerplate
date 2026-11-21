import { AppBaseException } from '@app/exceptions/app.base.exception';
import { AppUnknownException } from '@app/exceptions/app.unknown.exception';
import { DatabaseService } from '@common/database/services/database.service';
import { DatabaseUtil } from '@common/database/utils/database.util';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import type { UserClaimUsernameRequestDto } from '@modules/user/dtos/request/user.claim-username.request.dto';
import { UserUsernameExistException } from '@modules/user/exceptions/user.username-exist.exception';
import { UserProfileService } from '@modules/user/services/user.profile.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserClaimUsernameUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        UserClaimUsernameRequestDto,
    ],
    IResponseReturn<void>
> {
    constructor(
        private readonly userProfileService: UserProfileService,
        private readonly userService: UserService,
        private readonly databaseService: DatabaseService,
        private readonly databaseUtil: DatabaseUtil
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        { username }: UserClaimUsernameRequestDto
    ): Promise<IResponseReturn<void>> {
        // Sequential by design: a write after its checks
        const check = await this.userService.checkUsername(username);
        this.userService.assertUsernameAvailable(check);

        try {
            await this.databaseService.withTransaction(async tx =>
                this.userProfileService.claimUsernameInTx(
                    tx,
                    requestContext,
                    apiKeyContext,
                    authContext,
                    username
                )
            );
        } catch (err: unknown) {
            if (err instanceof AppBaseException) {
                throw err;
            }

            const isUsernameCollision = this.databaseUtil.isUniqueCollision(
                err,
                'username'
            );
            if (isUsernameCollision) {
                throw new UserUsernameExistException();
            }

            throw new AppUnknownException(err);
        }

        return {};
    }
}
