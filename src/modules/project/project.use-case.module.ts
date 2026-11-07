import { ProjectModule } from '@modules/project/project.module';
import { ProjectGetListCursorByMemberUseCase } from '@modules/project/use-cases/project.get-list-cursor-by-member.use-case';
import { ProjectCreateUseCase } from '@modules/project/use-cases/project.create.use-case';
import { ProjectGetUseCase } from '@modules/project/use-cases/project.get.use-case';
import { ProjectUpdateUseCase } from '@modules/project/use-cases/project.update.use-case';
import { ProjectUpdateSlugUseCase } from '@modules/project/use-cases/project.update-slug.use-case';
import { ProjectSoftDeleteUseCase } from '@modules/project/use-cases/project.soft-delete.use-case';
import { ProjectGetListOffsetByAdminUseCase } from '@modules/project/use-cases/project.get-list-offset-by-admin.use-case';
import { ProjectGetByIdByAdminUseCase } from '@modules/project/use-cases/project.get-by-id-by-admin.use-case';
import { ProjectGetMembersListUseCase } from '@modules/project/use-cases/project.get-members-list.use-case';
import { ProjectAssignMemberUseCase } from '@modules/project/use-cases/project.assign-member.use-case';
import { ProjectUpdateMemberRoleUseCase } from '@modules/project/use-cases/project.update-member-role.use-case';
import { ProjectRemoveMemberUseCase } from '@modules/project/use-cases/project.remove-member.use-case';
import { ProjectLeaveUseCase } from '@modules/project/use-cases/project.leave.use-case';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [
        ProjectGetListCursorByMemberUseCase,
        ProjectCreateUseCase,
        ProjectGetUseCase,
        ProjectUpdateUseCase,
        ProjectUpdateSlugUseCase,
        ProjectSoftDeleteUseCase,
        ProjectGetListOffsetByAdminUseCase,
        ProjectGetByIdByAdminUseCase,
        ProjectGetMembersListUseCase,
        ProjectAssignMemberUseCase,
        ProjectUpdateMemberRoleUseCase,
        ProjectRemoveMemberUseCase,
        ProjectLeaveUseCase,
    ],
    exports: [
        ProjectGetListCursorByMemberUseCase,
        ProjectCreateUseCase,
        ProjectGetUseCase,
        ProjectUpdateUseCase,
        ProjectUpdateSlugUseCase,
        ProjectSoftDeleteUseCase,
        ProjectGetListOffsetByAdminUseCase,
        ProjectGetByIdByAdminUseCase,
        ProjectGetMembersListUseCase,
        ProjectAssignMemberUseCase,
        ProjectUpdateMemberRoleUseCase,
        ProjectRemoveMemberUseCase,
        ProjectLeaveUseCase,
    ],
    imports: [ProjectModule, WorkspaceModule],
})
export class ProjectUseCaseModule {}
