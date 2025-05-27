export interface VCardProps {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    prefix?: string;
    suffix?: string;
    nickname?: string;
    email?: string;
    phone?: string;
    homePhone?: string;
    workPhone?: string;
    cellPhone?: string;
    fax?: string;
    org?: string;
    title?: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    website?: string;
    birthday?: string;
    photoUrl?: string;
    gender?: string;
    timezone?: string;
    note?: string;
    [key: string]: string | undefined;
}