
import { supabase } from './supabase';
import { APP_ID } from '../constants';

export type LogAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT';

interface LogEntry {
    user_uuid: string;
    username: string;
    logtxt: string;
    appname: string;
    app_id: number;
    action: LogAction;
}

// Simple in-memory cache to avoid repeated fetches
let cachedAppName: string | null = null;
const cachedUsernames: Record<string, string> = {};

const getAppName = async (): Promise<string> => {
    if (cachedAppName) return cachedAppName;

    const { data, error } = await supabase
        .from('gamahub_apps')
        .select('nome')
        .eq('id', APP_ID) // User Correction: Query 'id' column in gamahub_apps, not 'app_id'
        // Requirement says: "A partir do app_id, o app deve buscar na tabela gamahub_apps a coluna nome."
        .single();

    if (error || !data) {
        console.error("Error fetching app name:", error);
        return "Unknown App";
    }

    cachedAppName = data.nome;
    return data.nome;
};

const getUsername = async (userId: string): Promise<string> => {
    if (cachedUsernames[userId]) return cachedUsernames[userId];

    const { data, error } = await supabase
        .from('users') // Requirement says "tabela users"
        .select('username')
        .eq('user_id', userId)
        .single();

    if (error || !data) {
        console.error("Error fetching username:", error);
        return "Unknown User";
    }

    cachedUsernames[userId] = data.username;
    return data.username;
};

export const logAction = async (
    userId: string,
    action: LogAction,
    logtxt: string
) => {
    try {
        const [appname, username] = await Promise.all([
            getAppName(),
            getUsername(userId)
        ]);

        const entry: LogEntry = {
            user_uuid: userId,
            username: username,
            logtxt: logtxt,
            appname: appname,
            app_id: APP_ID,
            action: action
        };

        const { error } = await supabase
            .from('logs') // Requirement says "public.logs"
            .insert([entry]);

        if (error) {
            console.error("Failed to write log:", error);
        } else {
            console.log(`[LOG] ${action}: ${logtxt}`);
        }
    } catch (err) {
        console.error("Unexpected error in logger:", err);
    }
};
