import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Placeholder guard for project membership validation.
 * Project access is enforced via tenant permissions in this module.
 */
@Injectable()
export class ProjectMemberGuard implements CanActivate {
    async canActivate(_context: ExecutionContext): Promise<boolean> {
        return true;
    }
}
