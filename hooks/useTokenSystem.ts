
import { useState, useEffect, useCallback, useRef } from 'react';

const TOKEN_DURATION_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 2;
const MAX_DISTANCE_KM = 3.0;

interface TokenState {
    token: string | null;
    timeLeft: number; // in seconds
    totalDuration: number; // in seconds
    isLocked: boolean;
    attempts: number;
}

export const useTokenSystem = () => {
    const [token, setToken] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<number | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    const generateToken = useCallback(() => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 3; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }, []);

    // Timer & Regeneration Logic
    useEffect(() => {
        // Removed distance check to ensure token is always generated. 
        // Usage validation is handled in the UI/App logic.


        const now = Date.now();

        // If no token or expired, generate new
        if (!expiresAt || now >= expiresAt) {
            const newToken = generateToken();
            const newExpiry = now + TOKEN_DURATION_MS;

            setToken(newToken);
            setExpiresAt(newExpiry);
            setIsLocked(false); // Unlock on new token
            setAttempts(0); // Reset attempts
        }

        // Interval to update timeLeft
        const interval = setInterval(() => {
            if (expiresAt) {
                const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
                setTimeLeft(remaining);

                // Trigger regen if expired
                if (remaining <= 0) {
                    // The next effect run will catch this via dependency or we can force it
                    // Actually, the dependency on expiresAt won't auto-trigger unless we change state.
                    // We need to loop this efficiently.
                    const newToken = generateToken();
                    const newExpiry = Date.now() + TOKEN_DURATION_MS;
                    setToken(newToken);
                    setExpiresAt(newExpiry);
                    setIsLocked(false);
                    setAttempts(0);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt, generateToken]);

    const verifyToken = (input: string): boolean => {
        if (isLocked) return false;
        if (!token) return false;

        if (input === token) {
            return true;
        } else {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            if (newAttempts >= MAX_ATTEMPTS) {
                setIsLocked(true);
            }
            return false;
        }
    };

    return {
        token,
        timeLeft,
        totalDuration: TOKEN_DURATION_MS / 1000,
        isLocked,
        attempts,
        verifyToken
    };
};
