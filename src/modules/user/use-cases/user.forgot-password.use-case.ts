import { DatabaseService } from '@common/database/services/database.service';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { UserService } from '@modules/user/services/user.service';
import { UserPasswordService } from '@modules/user/services/user.password.service';
import type { UserForgotPasswordRequestDto } from '@modules/user/dtos/request/user.forgot-password.request.dto';
import { Injectable } from '@nestjs/common';
import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';

@Injectable()
export class UserForgotPasswordUseCase implements IAppUseCase<
    [IRequestContext, IApiKeyContext, UserForgotPasswordRequestDto],
    IResponseReturn<void>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userPasswordService: UserPasswordService,
        private readonly databaseService: DatabaseService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        { email }: UserForgotPasswordRequestDto
    ): Promise<IResponseReturn<void>> {
        this.userService.assertEmailDeliverable();

        const prepared =
            await this.userPasswordService.prepareForgotPassword(email);
        if (prepared === null) {
            return {};
        }

        const { user, forgot } = prepared;
        await this.databaseService.withTransaction(async tx =>
            this.userPasswordService.createForgotPasswordInTx(
                tx,
                requestContext,
                apiKeyContext,
                user.id,
                email,
                forgot
            )
        );

        return {};
    }
}
