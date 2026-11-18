import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import config from '../config.js';

export const VALID_AREAS = ['venue', 'schedule', 'food', 'judging', 'budget', 'general'];
export const VALID_TYPES = ['fact', 'request', 'constraint', 'preference', 'availability', 'correction', 'irrelevant'];
export const VALID_STATUSES = ['accepted', 'superseded', 'rejected', 'uncertain', 'irrelevant'];

export class EvidenceService {
  constructor(storagePath = config.paths.evidence, rejectedPath = config.paths.rejected) {
    this.storagePath = storagePath;
    this.rejectedPath = rejectedPath;
    this.claims = new Map(); // id -> claim
    this.messages = new Map(); // id -> raw message
  }

  /**
   * Generates a stable, content-addressable ID for an evidence claim
   */
  generateClaimId(messageId, area, claimText) {
    const raw = `${messageId || ''}:${area || ''}:${claimText ? claimText.trim().toLowerCase() : ''}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex').substring(0, 10);
    return `ev_${hash}`;
  }

  /**
   * Creates a validated evidence claim object adhering strictly to the required schema
   */
  createClaim({
    id = null,
    messageId,
    area = 'general',
    claim,
    value = null,
    unit = null,
    source = 'Unknown',
    date = null,
    type = 'fact',
    status = 'accepted',
    confidence = 1.0,
    reason = null
  }) {
    if (!messageId) {
      throw new Error('Evidence claim must reference a valid source messageId.');
    }
    if (!claim || typeof claim !== 'string') {
      throw new Error('Evidence claim must contain non-empty claim text.');
    }

    const normalizedArea = VALID_AREAS.includes(area) ? area : 'general';
    const normalizedType = VALID_TYPES.includes(type) ? type : 'fact';
    const normalizedStatus = VALID_STATUSES.includes(status) ? status : 'uncertain';

    const claimId = id || this.generateClaimId(messageId, normalizedArea, claim);

    return {
      id: claimId,
      messageId,
      area: normalizedArea,
      claim: claim.trim(),
      value: value !== undefined ? value : null,
      unit: unit !== undefined ? unit : null,
      source: source || 'Unknown',
      date: date || null,
      type: normalizedType,
      status: normalizedStatus,
      confidence: typeof confidence === 'number' ? confidence : null,
      reason: reason || null
    };
  }

  /**
   * Adds one or more claims to the active evidence ledger
   */
  addClaims(claims) {
    const added = [];
    const claimList = Array.isArray(claims) ? claims : [claims];

    for (const raw of claimList) {
      const claim = this.createClaim(raw);
      this.claims.set(claim.id, claim);
      added.push(claim);
    }

    return added;
  }

  /**
   * Registers source messages for provenance tracking
   */
  registerMessages(messages) {
    const list = Array.isArray(messages) ? messages : [messages];
    for (const msg of list) {
      if (msg && msg.id) {
        this.messages.set(msg.id, msg);
      }
    }
  }

  /**
   * Updates the status of an existing claim (e.g. superseded or rejected)
   */
  updateClaimStatus(id, newStatus, reason = null) {
    if (!this.claims.has(id)) {
      throw new Error(`Claim not found with ID: ${id}`);
    }
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Allowed: ${VALID_STATUSES.join(', ')}`);
    }

    const claim = this.claims.get(id);
    claim.status = newStatus;
    if (reason) claim.reason = reason;
    this.claims.set(id, claim);
    return claim;
  }

  /**
   * Returns all claims, optionally filtered by status and/or area
   */
  getClaims({ area = null, status = null, type = null } = {}) {
    const all = Array.from(this.claims.values());
    return all.filter(c => {
      if (area && c.area !== area) return false;
      if (status && c.status !== status) return false;
      if (type && c.type !== type) return false;
      return true;
    });
  }

  /**
   * Returns accepted evidence for planning
   */
  getAcceptedEvidence(area = null) {
    return this.getClaims({ area, status: 'accepted' });
  }

  /**
   * Returns rejected and irrelevant claims with explanatory reasons
   */
  getRejectedEvidence() {
    return Array.from(this.claims.values()).filter(
      c => c.status === 'rejected' || c.status === 'irrelevant'
    );
  }

  /**
   * Returns uncertain statements that could not be confidently interpreted
   */
  getUncertainEvidence() {
    return this.getClaims({ status: 'uncertain' });
  }

  /**
   * Serializes and writes evidence records and rejected logs to local JSON files
   */
  save(customPath = null) {
    const targetPath = customPath || this.storagePath;
    const outputDir = path.dirname(targetPath);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const ledgerPayload = {
      updatedAt: new Date().toISOString(),
      totalClaims: this.claims.size,
      messagesTracked: this.messages.size,
      claims: Array.from(this.claims.values()),
      messages: Array.from(this.messages.values())
    };

    fs.writeFileSync(targetPath, JSON.stringify(ledgerPayload, null, 2), 'utf-8');

    // Also persist rejected.json
    const rejectedClaims = this.getRejectedEvidence();
    const rejectedPayload = {
      updatedAt: new Date().toISOString(),
      count: rejectedClaims.length,
      rejected: rejectedClaims.map(c => ({
        claimId: c.id,
        messageId: c.messageId,
        area: c.area,
        claim: c.claim,
        source: c.source,
        reason: c.reason || 'Flagged as invalid or contradictory during evaluation'
      }))
    };

    fs.writeFileSync(this.rejectedPath, JSON.stringify(rejectedPayload, null, 2), 'utf-8');

    return {
      storagePath: targetPath,
      rejectedPath: this.rejectedPath,
      totalClaims: this.claims.size,
      rejectedCount: rejectedClaims.length
    };
  }

  /**
   * Loads existing evidence ledger from disk if present
   */
  load(customPath = null) {
    const targetPath = customPath || this.storagePath;

    if (!fs.existsSync(targetPath)) {
      return false;
    }

    try {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
      this.claims.clear();
      this.messages.clear();

      if (Array.isArray(data.claims)) {
        for (const c of data.claims) {
          this.claims.set(c.id, c);
        }
      }

      if (Array.isArray(data.messages)) {
        for (const m of data.messages) {
          this.messages.set(m.id, m);
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  clear() {
    this.claims.clear();
    this.messages.clear();
  }
}

export const evidenceService = new EvidenceService();
export default evidenceService;
