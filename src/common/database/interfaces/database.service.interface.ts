import { ConnectionStates } from 'mongoose';

export interface IDatabaseService {
    checkMongoConnection(): ConnectionStates;
}
