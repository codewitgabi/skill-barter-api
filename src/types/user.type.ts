export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  username?: string;
  email?: string;
  about?: string;
  city?: string;
  country?: string;
  website?: string | null;
  skills?: string[];
  interests?: string[];
  language?: string;
  timezone?: string;
}
