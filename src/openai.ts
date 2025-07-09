import OpenAI from "openai";
import {openAILog as log} from "./logging"
import {AiResponse, MessageData, ChatMessage} from "./types";

const apiKey = process.env['OPENAI_API_KEY'];
const baseURL = process.env['OPENAI_API_BASE'];

const openai = new OpenAI({ 
    apiKey, 
    baseURL 
});


// Store the single assistant instance
let assistant: any = null;

// Store threads for each conversation
const threads: Map<string, any> = new Map();

// Get assistant ID from environment variable
const ASSISTANT_ID = process.env['OPENAI_ASSISTANT_ID'];

/**
 * Retrieves the predefined assistant using the assistant ID from environment variable
 */
async function getAssistant(): Promise<any> {
    if (!ASSISTANT_ID) {
        throw new Error('ASSISTANT_ID environment variable is not defined. Please set OPENAI_ASSISTANT_ID to use a predefined assistant.');
    }

    // Return cached assistant if already retrieved
    if (assistant) {
        console.log(`[ASSISTANT] Using cached: "${assistant.name}"`);
        return assistant;
    }

    // Retrieve the assistant from OpenAI
    try {
        console.log(`[ASSISTANT] Retrieving assistant: ${ASSISTANT_ID}`);
        assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
        console.log(`[ASSISTANT] Successfully retrieved: "${assistant.name}"`);
        return assistant;
    } catch (error) {
        console.error(`[ASSISTANT] Failed to retrieve assistant:`, error);
        throw error;
    }
}

/**
 * Creates or retrieves a thread for the conversation
 * @param threadId The Mattermost thread ID
 */
async function getOrCreateThread(threadId: string): Promise<any> {
    // Check if thread already exists for this conversation
    if (threads.has(threadId)) {
        const thread = threads.get(threadId);
        console.log(`[THREAD] Using existing thread: ${thread.id}`);
        return thread;
    }

    // Create new thread for this conversation
    try {
        console.log(`[THREAD] Creating new thread for conversation: ${threadId}`);
        const thread = await openai.beta.threads.create();
        threads.set(threadId, thread);
        console.log(`[THREAD] Successfully created thread: ${thread.id}`);
        return thread;
    } catch (error) {
        console.error(`[THREAD] Failed to create thread:`, error);
        throw error;
    }
}

/**
 * Sends a message thread to chatGPT using Assistants API. The response can be the message responded by the AI model.
 * @param messages The message thread which should be sent.
 * @param msgData The message data of the last mattermost post representing the newest message in the message thread.
 */
export async function continueThread(messages: ChatMessage[], msgData: MessageData): Promise<AiResponse> {
    let aiResponse: AiResponse = {
        message: 'Sorry, but it seems I found no valid response.'
    }

    try {
        // Create system instruction from messages
        const systemMessage = messages.find(msg => msg.role === 'system');
        const instructions = systemMessage?.content || "You are a helpful assistant.";

        // Get assistant
        const assistant = await getAssistant();
        
        // Get or create thread
        const thread = await getOrCreateThread(msgData.post.id);

        // Add user messages to thread
        const userMessages = messages.filter(msg => msg.role === 'user');
        for (const userMsg of userMessages) {
            await openai.beta.threads.messages.create(thread.id, {
                role: "user",
                content: userMsg.content
            });
        }

        // Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });

        // Wait for the run to complete
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        
        while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        // Get the response
        if (runStatus.status === 'completed') {
            const threadMessages = await openai.beta.threads.messages.list(thread.id);
            const lastMessage = threadMessages.data[0]; // Most recent message
            
            if (lastMessage && lastMessage.content.length > 0) {
                const content = lastMessage.content[0];
                if (content.type === 'text') {
                    aiResponse.message = content.text.value;
                }
            }
        } else {
            log.error({ runStatus });
            aiResponse.message = `Error: Run status is ${runStatus.status}`;
        }

    } catch (error) {
        log.error({ error });
        aiResponse.message = `Sorry, but I encountered an error: ${error}`;
    }

    return aiResponse;
}

