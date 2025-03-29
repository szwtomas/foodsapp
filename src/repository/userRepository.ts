interface User {
    age: number;
    phoneNumber: string; // ID
    name: string;
    goal: string;
    gender: string;
    height: number;
    weight: number;
    physicalActivityLevel: string;
    dietaryRestrictions: string[];
    diseases: string[];
    conversation?: Message[];
}

interface Message {
    content: string;
    timestamp: Date;
    isUser: boolean;
}

export class UserRepository {
    private users: Map<string, User>;

    constructor() {
        this.users = new Map();
    }

    // Create a new user
    createUser(user: Omit<User, 'conversation'>): User {
        const newUser: User = {
            ...user,
            conversation: []
        };
        this.users.set(user.phoneNumber, newUser);
        return newUser;
    }

    // Get user by phone number
    getUser(phoneNumber: string): User | undefined {
        return this.users.get(phoneNumber);
    }

    // Update user
    updateUser(phoneNumber: string, updates: Partial<Omit<User, 'phoneNumber'>>): User | undefined {
        const user = this.users.get(phoneNumber);
        if (!user) return undefined;

        const updatedUser: User = {
            ...user,
            ...updates
        };
        this.users.set(phoneNumber, updatedUser);
        return updatedUser;
    }

    // Delete user
    deleteUser(phoneNumber: string): boolean {
        return this.users.delete(phoneNumber);
    }

    // Add message to user's conversation
    addMessage(phoneNumber: string, message: Omit<Message, 'timestamp'>): Message | undefined {
        const user = this.users.get(phoneNumber);
        if (!user) return undefined;

        const newMessage: Message = {
            ...message,
            timestamp: new Date()
        };

        if (!user.conversation) {
            user.conversation = [];
        }

        user.conversation.push(newMessage);
        return newMessage;
    }

    // Get user's conversation
    getConversation(phoneNumber: string): Message[] | undefined {
        const user = this.users.get(phoneNumber);
        return user?.conversation;
    }

    // Get all users
    getAllUsers(): User[] {
        return Array.from(this.users.values());
    }

    // Clear all users (useful for testing)
    clear(): void {
        this.users.clear();
    }
}