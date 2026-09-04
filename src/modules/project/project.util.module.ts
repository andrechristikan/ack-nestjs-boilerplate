import { ProjectUtil } from '@modules/project/utils/project.util';
import { Module } from '@nestjs/common';

@Module({
    controllers: [],
    providers: [ProjectUtil],
    exports: [ProjectUtil],
    imports: [],
})
export class ProjectUtilModule {}
