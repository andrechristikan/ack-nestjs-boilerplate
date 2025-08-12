import { Module } from '@nestjs/common';
import { UserRepositoryModule } from '@modules/user/repository/user.repository.module';
import { UserService } from '@modules/user/services/user.service';
import { RoleRepositoryModule } from '@modules/role/repository/role.repository.module';
import { CountryRepositoryModule } from '@modules/country/repository/country.repository.module';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
    imports: [
        UserRepositoryModule,
        CountryRepositoryModule,
        RoleRepositoryModule,
        AuthModule,
    ],
    exports: [UserService, UserRepositoryModule],
    providers: [UserService],
    controllers: [],
})
export class UserModule {}
