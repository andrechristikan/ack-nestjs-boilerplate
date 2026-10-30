import { RoleHttpService } from '@modules/role/services/http/role.http.service';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [RoleHttpService],
    exports: [RoleHttpService],
    imports: [],
})
export class RoleHttpModule {}
