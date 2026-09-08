import { RoleRepository } from '@modules/role/repositories/role.repository';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [RoleRepository],
    exports: [RoleRepository],
    imports: [],
})
export class RoleRepositoryModule {}
