export interface ISessionProcessor {
    processDeleteLoginSession(session: string): Promise<void>;
}
