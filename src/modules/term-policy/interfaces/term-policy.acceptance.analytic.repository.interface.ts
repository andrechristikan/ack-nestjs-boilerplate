export interface ITermPolicyAcceptanceAnalyticRow {
    id: string;
    userId: string;
    termPolicyId: string;
    acceptedAt: Date;
    createdAt: Date;
}

export interface ITermPolicyAcceptanceAnalyticRepository {
    countAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<number>;
    findAcceptances(
        startDate: Date | null,
        endDate: Date | null
    ): Promise<ITermPolicyAcceptanceAnalyticRow[]>;
}
