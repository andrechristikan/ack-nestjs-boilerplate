import { ProjectMemberGuard } from '@modules/project/guards/project.member.guard';
import { UseGuards, applyDecorators } from '@nestjs/common';

/**
 * Requires a valid project membership for the route.
 */
export function ProjectMemberProtected(): MethodDecorator {
    return applyDecorators(UseGuards(ProjectMemberGuard));
}
