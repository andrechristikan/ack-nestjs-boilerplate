import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ActivityLogMetadataStoreKey } from '@modules/activity-log/constants/activity-log.constant';
import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';
import { IActivityLogMetadataStoreService } from '@modules/activity-log/interfaces/activity-log.metadata-store.service.interface';

@Injectable()
export class ActivityLogMetadataStoreService implements IActivityLogMetadataStoreService {
    constructor(private readonly cls: ClsService) {}

    setMetadata(metadata: IActivityLogMetadata): void {
        const existing =
            this.cls.get<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey
            ) ?? {};
        this.cls.set(ActivityLogMetadataStoreKey, {
            ...existing,
            ...metadata,
        });
    }

    getMetadata(): IActivityLogMetadata {
        return (
            this.cls.get<IActivityLogMetadata>(
                ActivityLogMetadataStoreKey
            ) ?? {}
        );
    }
}
