import { Module } from '@nestjs/common';
import { UserRepositoryModule } from 'src/modules/user/repository/user.repository.module';
import { UserService } from './services/user.service';
import {UserPublicResolver} from "./resolvers/user.public.resolver";
import {AuthModule} from "../../common/auth/auth.module";
import {RoleModule} from "../role/role.module";

@Module({
    imports: [UserRepositoryModule,AuthModule,RoleModule],
    exports: [UserService],
    providers: [UserService,UserPublicResolver],
    controllers: [],
})
export class UserModule {}
