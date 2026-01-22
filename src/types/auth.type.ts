import { DifficultyLevel } from "../models/skillToTeach.model";

export interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  skillsToTeach?: Array<{ name: string; difficulty: DifficultyLevel }>;
  skillsToLearn?: Array<{ name: string; difficulty: DifficultyLevel }>;
  about?: string;
  city?: string;
  country?: string;
  profile_picture?: string;
  weekly_availability?: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
}
