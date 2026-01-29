import { SpacesServiceClient } from "@google-apps/meet";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { calendar_v3, google } from "googleapis";
import { BadRequestError } from "../utils/api.errors";

const SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/calendar",
];

class GoogleMeetService {
  private meetClient: SpacesServiceClient | null = null;
  private calendarClient: calendar_v3.Calendar | null = null;

  private getCredentialsFromEnv(): any {
    const credentialsJson = process.env.GOOGLE_MEET_CREDENTIALS;

    if (!credentialsJson) {
      throw new BadRequestError(
        "GOOGLE_MEET_CREDENTIALS environment variable is not set",
      );
    }

    try {
      return JSON.parse(credentialsJson);
    } catch (error: any) {
      throw new BadRequestError(
        `Failed to parse GOOGLE_MEET_CREDENTIALS: ${error.message}`,
      );
    }
  }

  private async getAuthenticatedClient(): Promise<SpacesServiceClient> {
    if (this.meetClient) {
      return this.meetClient;
    }

    try {
      const credentials = this.getCredentialsFromEnv();

      let authClient: OAuth2Client | GoogleAuth;

      if (credentials.type === "service_account") {
        const googleAuth = new GoogleAuth({
          credentials: credentials,
          scopes: SCOPES,
        });
        authClient = (await googleAuth.getClient()) as any;
      } else {
        const creds = credentials.installed || credentials.web || credentials;

        const oauthClient = new OAuth2Client(
          creds.client_id,
          creds.client_secret,
          creds.redirect_uris?.[0] || "http://localhost",
        );

        if (creds.refresh_token) {
          oauthClient.setCredentials({
            refresh_token: creds.refresh_token,
          });
        } else if (process.env.GOOGLE_MEET_REFRESH_TOKEN) {
          oauthClient.setCredentials({
            refresh_token: process.env.GOOGLE_MEET_REFRESH_TOKEN,
          });
        } else {
          throw new BadRequestError(
            "Refresh token is required. Please set GOOGLE_MEET_REFRESH_TOKEN or include refresh_token in credentials",
          );
        }

        authClient = oauthClient;
      }

      this.meetClient = new SpacesServiceClient({
        authClient: authClient as any,
      } as any);

      return this.meetClient;
    } catch (error: any) {
      throw new BadRequestError(
        `Failed to authenticate with Google Meet: ${error.message}`,
      );
    }
  }

  private async getCalendarClient(): Promise<calendar_v3.Calendar> {
    if (this.calendarClient) {
      return this.calendarClient;
    }

    try {
      const credentials = this.getCredentialsFromEnv();

      let authClient: OAuth2Client | GoogleAuth;

      if (credentials.type === "service_account") {
        const googleAuth = new GoogleAuth({
          credentials: credentials,
          scopes: SCOPES,
        });
        authClient = (await googleAuth.getClient()) as any;
      } else {
        const creds = credentials.installed || credentials.web || credentials;

        const oauthClient = new OAuth2Client(
          creds.client_id,
          creds.client_secret,
          creds.redirect_uris?.[0] || "http://localhost",
        );

        if (creds.refresh_token) {
          oauthClient.setCredentials({
            refresh_token: creds.refresh_token,
          });
        } else if (process.env.GOOGLE_MEET_REFRESH_TOKEN) {
          oauthClient.setCredentials({
            refresh_token: process.env.GOOGLE_MEET_REFRESH_TOKEN,
          });
        } else {
          throw new BadRequestError(
            "Refresh token is required. Please set GOOGLE_MEET_REFRESH_TOKEN or include refresh_token in credentials",
          );
        }

        authClient = oauthClient;
      }

      this.calendarClient = google.calendar({
        version: "v3",
        auth: authClient as any,
      });

      return this.calendarClient;
    } catch (error: any) {
      throw new BadRequestError(
        `Failed to authenticate with Google Calendar: ${error.message}`,
      );
    }
  }

  async createMeetingSpace(): Promise<string> {
    try {
      const meetClient = await this.getAuthenticatedClient();

      const request = {
        space: {
          config: {
            accessType: 1, // OPEN - allows anyone with link to join without approval
          },
        },
      };

      const response = await meetClient.createSpace(request);

      if (!response[0]?.meetingUri) {
        throw new BadRequestError("Failed to create Google Meet space");
      }

      return response[0].meetingUri;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError(
        `Failed to create Google Meet space: ${error.message}`,
      );
    }
  }

  async createScheduledMeeting(
    scheduledDate: Date,
    duration: number,
    summary: string = "Session",
    description?: string,
    instructorEmail?: string,
    learnerEmail?: string,
  ): Promise<string> {
    try {
      // Create a Meet space with OPEN access
      const meetLink = await this.createMeetingSpace();

      // Create a calendar event and attach the Meet link
      const calendar = await this.getCalendarClient();

      const startTime = new Date(scheduledDate);
      const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

      const attendees = [];
      if (instructorEmail) {
        attendees.push({ email: instructorEmail });
      }
      if (learnerEmail) {
        attendees.push({ email: learnerEmail });
      }

      const event = {
        summary,
        description:
          description || `Scheduled session at ${startTime.toLocaleString()}`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        attendees: attendees.length > 0 ? attendees : undefined,
        conferenceData: {
          entryPoints: [
            {
              entryPointType: "video",
              uri: meetLink,
              label: "Google Meet",
            },
          ],
        },
      };

      await calendar.events.insert({
        calendarId: "primary",
        requestBody: event,
        conferenceDataVersion: 1,
      });

      return meetLink;
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error;
      }
      throw new BadRequestError(
        `Failed to create scheduled Google Meet: ${error.message}`,
      );
    }
  }
}

const googleMeetService = new GoogleMeetService();
export default googleMeetService;
