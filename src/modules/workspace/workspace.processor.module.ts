import { WorkspaceProcessor } from '@modules/workspace/processors/workspace.processor';
import { WorkspaceProcessorService } from '@modules/workspace/services/workspace.processor.service';
import { WorkspaceModule } from '@modules/workspace/workspace.module';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [WorkspaceProcessor, WorkspaceProcessorService],
    exports: [],
    imports: [WorkspaceModule],
})
export class WorkspaceProcessorModule {}
