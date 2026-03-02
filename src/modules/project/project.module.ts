import { Module } from '@nestjs/common';
import { ProjectService } from '@modules/project/services/project.service';
import { ProjectMemberService } from '@modules/project/services/project-member.service';
import { ProjectRepository } from '@modules/project/repositories/project.repository';
import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { ProjectPermissionGuard } from '@modules/project/guards/project.permission.guard';
import { ProjectUtil } from '@modules/project/utils/project.util';
import { InviteModule } from '@modules/invite/invite.module';
import { UserModule } from '@modules/user/user.module';
import { RoleModule } from '@modules/role/role.module';
import { ProjectInviteType } from '@modules/project/constants/project.constant';
import { ProjectPublicController } from '@modules/project/controllers/project.public.controller';
import { ConfigService } from '@nestjs/config';

@Module({
    imports: [
        UserModule,
        RoleModule,
        InviteModule.forFeatureAsync({
            inviteType: ProjectInviteType,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                expiredInMinutes: configService.getOrThrow<number>(
                    'invite.expiredInMinutes'
                ),
                linkBaseUrl: configService.getOrThrow<string>(
                    'invite.linkBaseUrl'
                ),
            }),
        }),
    ],
    providers: [
        ProjectService,
        ProjectMemberService,
        ProjectUtil,
        ProjectRepository,
        ProjectMemberGuard,
        ProjectPermissionGuard,
    ],
    exports: [
        ProjectService,
        ProjectMemberService,
        ProjectRepository,
    ],
    controllers: [ProjectPublicController],
})
export class ProjectModule {}
