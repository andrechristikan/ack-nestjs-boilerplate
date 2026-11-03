import { HelperStringService } from '@common/helper/services/helper.string.service';
import type { WorkspaceMember } from '@generated/prisma-client/client';
import { ProjectBypassRoles } from '@modules/project/constants/project.constant';
import type { IProjectMemberActor } from '@modules/project/interfaces/project.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProjectUtil {
    private readonly slugRegex: RegExp;
    private readonly slugPrefix: string;
    private readonly slugMaxLength: number;
    private readonly slugMaxAttempts: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperStringService: HelperStringService
    ) {
        this.slugRegex = this.configService.get<RegExp>('project.slugRegex')!;
        this.slugPrefix = this.configService.get<string>('project.slugPrefix')!;
        this.slugMaxLength = this.configService.get<number>(
            'project.slugMaxLength'
        )!;
        this.slugMaxAttempts = this.configService.get<number>(
            'project.slugMaxAttempts'
        )!;
    }

    drawSlugCandidates(): string[] {
        return this.helperStringService.generateSlugCandidates(
            this.slugPrefix,
            this.slugMaxLength,
            this.slugMaxAttempts
        );
    }

    isSlugAllowed(slug: string): boolean {
        const isPatternValid = this.slugRegex.test(slug);

        return slug.length <= this.slugMaxLength && isPatternValid;
    }

    hasWorkspaceBypass(workspaceMember: WorkspaceMember): boolean {
        return ProjectBypassRoles.includes(workspaceMember.role);
    }

    mapMemberActor(workspaceMember: WorkspaceMember): IProjectMemberActor {
        const hasWorkspaceBypass = this.hasWorkspaceBypass(workspaceMember);

        return { userId: workspaceMember.userId, hasWorkspaceBypass };
    }
}
