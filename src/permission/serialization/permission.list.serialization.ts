import { Exclude, Type } from 'class-transformer';
import { PermissionDocument } from '../schema/permission.schema';

export class PermissionListSerialization {
    constructor(partial: Partial<PermissionDocument[]>) {
        Object.assign(this, partial);
    }

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
