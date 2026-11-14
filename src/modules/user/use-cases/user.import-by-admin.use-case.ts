import type { IAppUseCase } from '@app/interfaces/app.use-case.interface';
import type { IRequestContext } from '@common/request/interfaces/request.interface';
import type { IResponseReturn } from '@common/response/interfaces/response.interface';
import { OutboxService } from '@modules/outbox/services/outbox.service';
import type { UserImportRequestDto } from '@modules/user/dtos/request/user.import.request.dto';
import type { UserImportResponseDto } from '@modules/user/dtos/response/user.import.response.dto';
import { UserImportService } from '@modules/user/services/user.import.service';
import { UserService } from '@modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import type { IApiKeyContext } from '@modules/api-key/interfaces/api-key.interface';
import type { IAuthJwtAccessContext } from '@modules/auth/interfaces/auth.interface';

@Injectable()
export class UserImportByAdminUseCase implements IAppUseCase<
    [
        IRequestContext,
        IApiKeyContext,
        IAuthJwtAccessContext,
        UserImportRequestDto[],
    ],
    IResponseReturn<UserImportResponseDto>
> {
    constructor(
        private readonly userService: UserService,
        private readonly userImportService: UserImportService,
        private readonly outboxService: OutboxService
    ) {}

    async execute(
        requestContext: IRequestContext,
        apiKeyContext: IApiKeyContext,
        authContext: IAuthJwtAccessContext,
        data: UserImportRequestDto[]
    ): Promise<IResponseReturn<UserImportResponseDto>> {
        const rows = data.map(({ email, name, username }) => ({
            email,
            name: name ?? null,
            username,
        }));
        const emails = rows.map(item => item.email);
        const usernames = rows.map(item => item.username);
        // Sequential by design: gate before the work it guards
        const [existingEmails, usernameChecks] = await Promise.all([
            this.userImportService.getExistingEmails(emails),
            this.userImportService.getUsernameChecks(usernames),
        ]);
        this.userImportService.assertEmailsAvailable(existingEmails);
        this.userImportService.assertImportByAdminRows(rows, usernameChecks);

        const effect = this.userService.importByAdminEffect(
            requestContext,
            apiKeyContext,
            authContext,
            rows
        );
        const outboxId = await this.outboxService.add(effect);

        return { data: { outboxId } };
    }
}
