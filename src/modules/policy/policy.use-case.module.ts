import { ActivityLogModule } from '@modules/activity-log/activity-log.module';
import { PolicyListByRoleByAdminUseCase } from '@modules/policy/use-cases/policy.list-by-role-by-admin.use-case';
import { PolicyListByRoleBySystemUseCase } from '@modules/policy/use-cases/policy.list-by-role-by-system.use-case';
import { PolicyCreateByAdminUseCase } from '@modules/policy/use-cases/policy.create-by-admin.use-case';
import { PolicyUpdateByAdminUseCase } from '@modules/policy/use-cases/policy.update-by-admin.use-case';
import { PolicyDeleteByAdminUseCase } from '@modules/policy/use-cases/policy.delete-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        PolicyListByRoleByAdminUseCase,
        PolicyListByRoleBySystemUseCase,
        PolicyCreateByAdminUseCase,
        PolicyUpdateByAdminUseCase,
        PolicyDeleteByAdminUseCase,
    ],
    exports: [
        PolicyListByRoleByAdminUseCase,
        PolicyListByRoleBySystemUseCase,
        PolicyCreateByAdminUseCase,
        PolicyUpdateByAdminUseCase,
        PolicyDeleteByAdminUseCase,
    ],
    imports: [ActivityLogModule],
})
export class PolicyUseCaseModule {}
