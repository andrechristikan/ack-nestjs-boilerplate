import { RoleHttpService } from '@modules/role/services/role.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [RoleHttpService],
    exports: [RoleHttpService],
    imports: [],
})
export class RoleHttpModule {}
