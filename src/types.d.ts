export type JSONMessageData = {
    mentions?: string,
    post: string,
    sender_name: string
}

export type Post = {
    id: string;
    create_at: number;
    update_at: number;
    edit_at: number;
    delete_at: number;
    is_pinned: boolean;
    user_id: string;
    channel_id: string;
    root_id: string;
    original_id: string;
    message: string;
    type: string;
    props: Record<string, any>;
    hashtags: string;
    pending_post_id: string;
    reply_count: number;
    file_ids?: string[];
    metadata: any;
    failed?: boolean;
    user_activity_posts?: Post[];
    state?: string;
    filenames?: string[];
    last_reply_at?: number;
    participants?: any;
    message_source?: string;
    is_following?: boolean;
    exists?: boolean;
}

export type MessageData = {
    mentions: string[],
    post: Post,
    sender_name: string
}

export type AiResponse = {
    message: string,
    props?: Record<string, string>,
    fileId?: string,
    intermediate?: boolean
}

export type ChatMessage = {
    role: 'system' | 'user' | 'assistant',
    content: string,
    name?: string
}