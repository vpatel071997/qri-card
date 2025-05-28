export interface VCardProps {
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  birthday?: string;
  org?: string;
  photoUrl?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  facebook?: string;
  note?: string;
  [key: string]: string | undefined;
}
