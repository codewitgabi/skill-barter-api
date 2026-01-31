import { firestore } from "../config/firebase.config";
import { FieldValue } from "firebase-admin/firestore";
import sysLogger from "../utils/logger";

export interface ParticipantData {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  initials: string;
}

class ContactService {
  private conversationsCollection = "conversations";

  private generateConversationId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  async createConversation(
    user1: ParticipantData,
    user2: ParticipantData,
    exchangeRequestId: string,
  ): Promise<{ conversationId: string; created: boolean }> {
    const conversationId = this.generateConversationId(user1.id, user2.id);
    const conversationRef = firestore
      .collection(this.conversationsCollection)
      .doc(conversationId);

    try {
      // Check if conversation already exists
      const existingConversation = await conversationRef.get();

      if (existingConversation.exists) {
        sysLogger.info(
          `Conversation ${conversationId} already exists, skipping creation`,
        );
        return { conversationId, created: false };
      }

      // Create new conversation document with denormalized user data
      const conversationData = {
        participantIds: [user1.id, user2.id],
        participants: {
          [user1.id]: {
            id: user1.id,
            name: user1.name,
            username: user1.username,
            avatar: user1.avatar,
            initials: user1.initials,
          },
          [user2.id]: {
            id: user2.id,
            name: user2.name,
            username: user2.username,
            avatar: user2.avatar,
            initials: user2.initials,
          },
        },
        exchangeRequestId,
        createdAt: FieldValue.serverTimestamp(),
        lastMessage: null,
        unreadCount: {
          [user1.id]: 0,
          [user2.id]: 0,
        },
      };

      await conversationRef.set(conversationData);

      sysLogger.info(`Created conversation ${conversationId} in Firestore`);
      return { conversationId, created: true };
    } catch (error) {
      sysLogger.error(
        `Failed to create conversation in Firestore: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  getConversationId(userId1: string, userId2: string): string {
    return this.generateConversationId(userId1, userId2);
  }
}

const contactService = new ContactService();
export default contactService;
