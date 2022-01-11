import { Exclude, Type } from 'class-transformer';

export class PermissionListTransformer {
    @Type(() => String)
    readonly _id: string;

    readonly isActive: boolean;
    readonly name: string;
    readonly code: string;
    readonly description: string;
    readonly createdAt: Date;

    @Exclude()
    readonly updatedAt: Date;
}
