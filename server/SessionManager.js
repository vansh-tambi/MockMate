const fs = require('fs');
const path = require('path');

/**
 * SessionManager
 * File-based persistent storage for interview sessions
 * Prevents question repetition within and across sessions
 */
class SessionManager {
  constructor() {
    this.sessionsDir = path.join(__dirname, '../data/sessions');
    this._ensureDir();
  }

  /**
   * Ensure sessions directory exists
   */
  _ensureDir() {
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Get file path for session
   */
  _getSessionPath(sessionId) {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  /**
   * Create new session
   */
  createSession(sessionId, { role, level, userId = null }) {
    const session = {
      sessionId,
      userId,
      role,
      level,
      askedQuestions: [],      // Questions asked in THIS session
      askedQuestionIds: [],    // Just the IDs for quick lookup
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'in_progress'
    };

    this._saveSession(session);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    const filePath = this._getSessionPath(sessionId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      console.error(`Error reading session ${sessionId}:`, err);
      return null;
    }
  }

  /**
   * Add asked question to session
   */
  addAskedQuestion(sessionId, questionId, questionText) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Prevent duplicates
    if (!session.askedQuestionIds.includes(questionId)) {
      session.askedQuestions.push({
        questionId,
        questionText,
        askedAt: new Date().toISOString()
      });
      session.askedQuestionIds.push(questionId);
      session.updatedAt = new Date().toISOString();
      this._saveSession(session);
    }

    return session;
  }

  /**
   * Get all asked question IDs in this session
   */
  getAskedQuestionIds(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return [];
    }
    return session.askedQuestionIds;
  }

  /**
   * Get all previous sessions for a user (for cross-session exclusion)
   */
  getPreviousSessionsForUser(userId) {
    if (!userId) return [];

    const sessions = [];
    const files = fs.readdirSync(this.sessionsDir);

    for (const file of files) {
      try {
        const data = fs.readFileSync(path.join(this.sessionsDir, file), 'utf8');
        const session = JSON.parse(data);
        if (session.userId === userId && session.sessionId !== 'current') {
          sessions.push(session);
        }
      } catch (err) {
        // Skip invalid files
      }
    }

    return sessions;
  }

  /**
   * Get all asked question IDs across all previous sessions for this user
   */
  getPreviouslyAskedQuestionIds(userId, excludeCurrentSessionId = null) {
    if (!userId) return [];

    const previousSessions = this.getPreviousSessionsForUser(userId);
    const previouslyAsked = new Set();

    for (const session of previousSessions) {
      if (session.sessionId === excludeCurrentSessionId) continue;
      session.askedQuestionIds.forEach(id => previouslyAsked.add(id));
    }

    return Array.from(previouslyAsked);
  }

  /**
   * Mark session as complete
   */
  completeSession(sessionId, summary = {}) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    session.summary = summary;
    this._saveSession(session);

    return session;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }

    return {
      sessionId,
      status: session.status,
      questionsAsked: session.askedQuestionIds.length,
      startedAt: session.startedAt,
      completedAt: session.completedAt || null,
      durationMinutes: this._calculateDuration(session.startedAt, session.completedAt),
      role: session.role,
      level: session.level
    };
  }

  /**
   * Private: Save session to file
   */
  _saveSession(session) {
    const filePath = this._getSessionPath(session.sessionId);
    try {
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2));
    } catch (err) {
      console.error(`Error saving session ${session.sessionId}:`, err);
      throw err;
    }
  }

  /**
   * Private: Calculate duration in minutes
   */
  _calculateDuration(startTime, endTime) {
    if (!endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.round((end - start) / 60000);
  }

  /**
   * Clean up old sessions (optional - for maintenance)
   * Keeps last N sessions per user
   */
  cleanupOldSessions(userId, keepCount = 10) {
    const sessions = this.getPreviousSessionsForUser(userId);
    
    // Sort by date, newest first
    sessions.sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

    // Delete old ones
    const toDelete = sessions.slice(keepCount);
    for (const session of toDelete) {
      const filePath = this._getSessionPath(session.sessionId);
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error deleting session ${session.sessionId}:`, err);
      }
    }

    return {
      kept: keepCount,
      deleted: toDelete.length
    };
  }
}

module.exports = SessionManager;
