import { SpacesServiceClient } from "@google-apps/meet";
import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { BadRequestError } from "../utils/api.errors";

const SCOPES = ["https://www.googleapis.com/auth/meetings.space.created"];

class GoogleMeetService {
  private meetClient: SpacesServiceClient | null = null;

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
        authClient = await googleAuth.getClient() as any;
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
}

const googleMeetService = new GoogleMeetService();
export default googleMeetService;
