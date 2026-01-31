import { firestore } from "../config/firebase.config";
import { FieldValue } from "firebase-admin/firestore";
import sysLogger from "../utils/logger";

class ContactService {
  private conversationsCollection = "conversations";

  private generateConversationId(userId1: string, userId2: string): string {
    const sortedIds = [userId1, userId2].sort();
    return `${sortedIds[0]}_${sortedIds[1]}`;
  }

  async createConversation(
    userId1: string,
    userId2: string,
    exchangeRequestId: string,
  ): Promise<{ conversationId: string; created: boolean }> {
    const conversationId = this.generateConversationId(userId1, userId2);
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

      // Create new conversation document
      const conversationData = {
        participants: [userId1, userId2],
        exchangeRequestId,
        createdAt: FieldValue.serverTimestamp(),
        lastMessage: null,
        unreadCount: {
          [userId1]: 0,
          [userId2]: 0,
        },
      };

      await conversationRef.set(conversationData);

      console.log(`Created conversation ${conversationId} in Firestore`);
      return { conversationId, created: true };
    } catch (error) {
      console.error(
        `Failed to create conversation in Firestore:`,
        error instanceof Error ? error.message : "Unknown error",
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
