import { ApiKeyGetListByAdminUseCase } from '@modules/api-key/use-cases/api-key.get-list-by-admin.use-case';
import { ApiKeyCreateByAdminUseCase } from '@modules/api-key/use-cases/api-key.create-by-admin.use-case';
import { ApiKeyUpdateStatusByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-status-by-admin.use-case';
import { ApiKeyUpdateByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-by-admin.use-case';
import { ApiKeyUpdateDatesByAdminUseCase } from '@modules/api-key/use-cases/api-key.update-dates-by-admin.use-case';
import { ApiKeyResetByAdminUseCase } from '@modules/api-key/use-cases/api-key.reset-by-admin.use-case';
import { ApiKeyDeleteByAdminUseCase } from '@modules/api-key/use-cases/api-key.delete-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ApiKeyGetListByAdminUseCase,
        ApiKeyCreateByAdminUseCase,
        ApiKeyUpdateStatusByAdminUseCase,
        ApiKeyUpdateByAdminUseCase,
        ApiKeyUpdateDatesByAdminUseCase,
        ApiKeyResetByAdminUseCase,
        ApiKeyDeleteByAdminUseCase,
    ],
    exports: [
        ApiKeyGetListByAdminUseCase,
        ApiKeyCreateByAdminUseCase,
        ApiKeyUpdateStatusByAdminUseCase,
        ApiKeyUpdateByAdminUseCase,
        ApiKeyUpdateDatesByAdminUseCase,
        ApiKeyResetByAdminUseCase,
        ApiKeyDeleteByAdminUseCase,
    ],
    imports: [],
})
export class ApiKeyUseCaseModule {}
