import { PolicyListByRoleUseCase } from '@modules/policy/use-cases/policy.list-by-role.use-case';
import { PolicyCreateByAdminUseCase } from '@modules/policy/use-cases/policy.create-by-admin.use-case';
import { PolicyUpdateByAdminUseCase } from '@modules/policy/use-cases/policy.update-by-admin.use-case';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        PolicyListByRoleUseCase,
        PolicyCreateByAdminUseCase,
        PolicyUpdateByAdminUseCase,
        PolicyDeleteByAdminUseCase,
    ],
    exports: [
        PolicyListByRoleUseCase,
        PolicyCreateByAdminUseCase,
        PolicyUpdateByAdminUseCase,
        PolicyDeleteByAdminUseCase,
    ],
    imports: [],
})
export class PolicyUseCaseModule {}
