export interface IDashboardStartAndEndDate {
    startDate: Date;
    endDate: Date;
}

export interface IDashboardStartAndEndYear {
    startYear: number;
    endYear: number;
}

export interface IDashboardStartAndEnd {
    month: number;
    year: number;
}

export interface IDashboardMonthAndYear extends Partial<IDashboardStartAndEnd> {
    total: number;
}
