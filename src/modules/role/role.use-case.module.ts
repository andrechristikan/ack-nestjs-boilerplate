import { RoleGetListOffsetByAdminUseCase } from '@modules/role/use-cases/role.get-list-offset-by-admin.use-case';
import { RoleGetListCursorBySystemUseCase } from '@modules/role/use-cases/role.get-list-cursor-by-system.use-case';
import { RoleGetOneUseCase } from '@modules/role/use-cases/role.get-one.use-case';
import { RoleCreateByAdminUseCase } from '@modules/role/use-cases/role.create-by-admin.use-case';
import { RoleUpdateByAdminUseCase } from '@modules/role/use-cases/role.update-by-admin.use-case';
import { RoleDeleteByAdminUseCase } from '@modules/role/use-cases/role.delete-by-admin.use-case';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        RoleGetListOffsetByAdminUseCase,
        RoleGetListCursorBySystemUseCase,
        RoleGetOneUseCase,
        RoleCreateByAdminUseCase,
        RoleUpdateByAdminUseCase,
        RoleDeleteByAdminUseCase,
    ],
    exports: [
        RoleGetListOffsetByAdminUseCase,
        RoleGetListCursorBySystemUseCase,
        RoleGetOneUseCase,
        RoleCreateByAdminUseCase,
        RoleUpdateByAdminUseCase,
        RoleDeleteByAdminUseCase,
    ],
    imports: [],
})
export class RoleUseCaseModule {}
