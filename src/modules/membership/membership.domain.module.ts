import { MembershipInviteDomain } from '@modules/membership/domains/membership.invite.domain';
import { MembershipWorkspaceDomain } from '@modules/membership/domains/membership.workspace.domain';
import { ProjectDomainModule } from '@modules/project/project.domain.module';
import { UserDomainModule } from '@modules/user/user.domain.module';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

/** Composition module: flows that write across the workspace, project, and user modules in one transaction. */
@Module({
    controllers: [],
    providers: [MembershipInviteDomain, MembershipWorkspaceDomain],
    exports: [MembershipInviteDomain, MembershipWorkspaceDomain],
    imports: [ProjectDomainModule, UserDomainModule, WorkspaceDomainModule],
})
export class MembershipDomainModule {}
