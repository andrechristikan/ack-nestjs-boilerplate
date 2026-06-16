import { IActivityLogMetadata } from '@modules/activity-log/interfaces/activity-log.interface';

export interface IActivityLogMetadataStoreService {
    /** Merge metadata into the current request's activity-log context. */
    setMetadata(metadata: IActivityLogMetadata): void;
    /** Read the accumulated activity-log metadata; empty object when none set. */
    getMetadata(): IActivityLogMetadata;
}
