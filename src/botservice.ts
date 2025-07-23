import {sendMessageToAssistant} from "./openai";
import {mmClient, wsClient} from "./mm-client";
import 'babel-polyfill'
import 'isomorphic-fetch'
import {WebSocketMessage} from "@mattermost/client";
import {JSONMessageData, MessageData, ChatMessage} from "./types";

import {botLog, matterMostLog} from "./logging";

if (!global.FormData) {
  global.FormData = require('form-data')
}


async function onClientMessage(msg: WebSocketMessage<JSONMessageData>, meId: string) {
  if (msg.event !== 'posted' || !meId) {
    matterMostLog.debug({msg: msg})
    return
  }

  const msgData = parseMessageData(msg.data)

  if (isMessageIgnored(msgData, meId)) {
    return
  }

  const chatmessages: ChatMessage[] = [];

  // Instead of thread context, only pass the current user message
  chatmessages.push({
    role: 'user',
    name: await userIdToName(msgData.post.user_id),
    content: msgData.post.message
  });

  // start typing
  const typing = () => wsClient.userTyping(msgData.post.channel_id, (msgData.post.root_id || msgData.post.id) ?? "")
  typing()
  const typingInterval = setInterval(typing, 2000)

  try {
    const {message, fileId, props} = await sendMessageToAssistant(chatmessages)
    botLog.trace({message})

    // create answer response
    const newPost = await mmClient.createPost({
      message: message,
      channel_id: msgData.post.channel_id,
      props,
      root_id: msgData.post.root_id || msgData.post.id,
      file_ids: fileId ? [fileId] : undefined
    } as any)
    botLog.trace({msg: newPost})
  } catch (e) {
    botLog.error(e)
    await mmClient.createPost({
      message: "Sorry, but I encountered an internal error when trying to process your message",
      channel_id: msgData.post.channel_id,
      root_id: msgData.post.root_id || msgData.post.id,
    } as any)
  } finally {
    // stop typing
    clearInterval(typingInterval)
  }
}

/**
 * Checks if we are responsible to answer to this message.
 * We do only respond to messages which are posted in a thread or addressed to the bot. We also do not respond to
 * message which were posted by the bot.
 * @param msgData The parsed message data
 * @param meId The mattermost client id
 */
function isMessageIgnored(msgData: MessageData, meId: string): boolean {
  // Odpowiadamy tylko na wiadomości, w których bot został wspomniany (mention)
  if (!msgData.mentions.includes(meId)) {
    return true;
  }
  // Nie odpowiadamy na własne wiadomości
  if (msgData.post.user_id === meId) {
    return true;
  }
  return false;
}

/**
 * Transforms a data object of a WebSocketMessage to a JS Object.
 * @param msg The WebSocketMessage data.
 */
function parseMessageData(msg: JSONMessageData): MessageData {
  return {
    mentions: JSON.parse(msg.mentions ?? '[]'),
    post: JSON.parse(msg.post),
    sender_name: msg.sender_name
  }
}

const usernameCache: Record<string, { username: string, expireTime: number }> = {}

/**
 * Looks up the mattermost username for the given userId. Every username which is looked up will be cached for 5 minutes.
 * @param userId
 */
async function userIdToName(userId: string): Promise<string> {
  let username: string

  // check if userId is in cache and not outdated
  if (usernameCache[userId] && Date.now() < usernameCache[userId].expireTime) {
    username = usernameCache[userId].username
  } else {
    // username not in cache our outdated
    username = (await mmClient.getUser(userId)).username

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) {
      username = username.replace(/[.@!?]/g, '_').slice(0, 64)
    }

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(username)) {
      username = [...username.matchAll(/[a-zA-Z0-9_-]/g)].join('').slice(0, 64)
    }

    usernameCache[userId] = {
      username: username,
      expireTime: Date.now() + 1000 * 60 * 5
    }
  }

  return username
}

/* Entry point */
async function main(): Promise<void> {
  const meId = (await mmClient.getMe()).id

  botLog.log("Connected to Mattermost.")

  wsClient.addMessageListener((e) => onClientMessage(e, meId))
  botLog.trace("Listening to MM messages...")
}

main().catch(reason => {
  botLog.error(reason);
  process.exit(-1)
})
