import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID);

/**
 * Validates a Google JWT passed in the Authorization header.
 * @param {import('next').NextApiRequest} req
 * @returns {Promise<boolean>} True if authorized, throws Error otherwise
 */
export async function verifyAuth(req) {
    // In local dev, you might want to bypass auth if not configured, but for security
    // we should enforce it if we are in production.
    if (!process.env.GOOGLE_CLIENT_ID && !process.env.VITE_GOOGLE_CLIENT_ID) {
        console.warn("OAuth is not configured on the server. Bypassing auth check.");
        return true;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid Authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        throw new Error('Token missing');
    }

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const email = payload.email;

        const allowedEmailsStr = process.env.ALLOWED_EMAILS || '';
        if (!allowedEmailsStr) {
            console.warn("ALLOWED_EMAILS is not set. All valid Google accounts are permitted.");
            return true;
        }

        const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase());
        
        if (!allowedEmails.includes(email.toLowerCase())) {
            console.warn(`Unauthorized access attempt by: ${email}`);
            throw new Error(`Email ${email} is not authorized`);
        }

        return true;
    } catch (e) {
        console.error("Token verification failed:", e.message);
        throw new Error('Invalid token or unauthorized');
    }
}
