import { RequestLogStoreKey } from '@common/request/constants/request.constant';
import { IRequestLog } from '@common/request/interfaces/request.interface';
import { RequestStoreService } from '@common/request/services/request.store.service';
import { WorkspaceMember } from '@generated/prisma-client';
import { ProjectWorkspaceBypassRole } from '@modules/project/constants/project.constant';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ProjectUtil {
    constructor(private readonly requestStoreService: RequestStoreService) {}

    getCurrentRequestLog(): IRequestLog {
        return this.requestStoreService.get<IRequestLog>(RequestLogStoreKey)!;
    }

    isWorkspaceOwner(workspaceMember: WorkspaceMember): boolean {
        return workspaceMember.role === ProjectWorkspaceBypassRole;
    }
}
