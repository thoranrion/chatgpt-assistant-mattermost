import OpenAI from "openai";
import {openAILog as log} from "./logging"
import {AiResponse, ChatMessage} from "./types";

const apiKey = process.env['OPENAI_API_KEY'];
const baseURL = process.env['OPENAI_API_BASE'];

const openai = new OpenAI({ 
    apiKey, 
    baseURL 
});


// Store the single assistant instance
let assistant: any = null;

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
 * Sends a user message to the OpenAI assistant in a new thread and returns the response.
 * @param messages Array of messages (usually one, role 'user').
 */
export async function sendMessageToAssistant(messages: ChatMessage[]): Promise<AiResponse> {
    try {
        const assistant = await getAssistant();
        const thread = await openai.beta.threads.create();

        // Only send user messages
        for (const msg of messages.filter(m => m.role === 'user')) {
            await openai.beta.threads.messages.create(thread.id, {
                role: 'user',
                content: msg.content
            });
        }

        // Run the assistant
        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id
        });

        // Wait for the assistant to finish generating a response
        let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        }

        if (runStatus.status === 'completed') {
            const threadMessages = await openai.beta.threads.messages.list(thread.id);
            const lastMessage = threadMessages.data[0];
            if (lastMessage && lastMessage.content.length > 0) {
                const content = lastMessage.content[0];
                if (content.type === 'text') {
                    return { message: content.text.value };
                }
            }
            return { message: 'No text response from assistant.' };
        } else {
            log.error({ runStatus });
            return { message: `Error: Run status is ${runStatus.status}` };
        }
    } catch (error) {
        log.error({ error });
        return { message: `Sorry, but I encountered an error: ${error}` };
    }
}

