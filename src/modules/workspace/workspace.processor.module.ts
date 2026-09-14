import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { WorkspaceDomainModule } from '@modules/workspace/workspace.domain.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [WorkspaceProcessor, WorkspaceProcessorService],
    exports: [],
    imports: [WorkspaceDomainModule],
})
export class WorkspaceProcessorModule {}
