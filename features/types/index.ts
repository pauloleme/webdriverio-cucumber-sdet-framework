export type SortOption = 'az' | 'za' | 'lohi' | 'hilo';

export type SortCriteria =
    | 'Name (A to Z)'
    | 'Name (Z to A)'
    | 'Price (low to high)'
    | 'Price (high to low)';

export interface CustomerInformation {
    readonly firstName: string;
    readonly lastName: string;
    readonly postalCode: string;
}

export interface CatalogProduct {
    readonly name: string;
    readonly price: number;
    readonly description: string;
}
