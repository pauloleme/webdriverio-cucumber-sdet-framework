import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type PassiveEvidenceType =
    | 'console-error'
    | 'javascript-exception'
    | 'network-failure'
    | 'http-error';

export type PassiveEvidenceSeverity = 'error';

export interface PassiveEvidenceRecord {
    readonly id: string;
    readonly timestamp: string;
    lastSeenAt: string;
    occurrences: number;
    readonly runId: string;
    readonly scenarioId: string;
    readonly scenarioName: string;
    readonly type: PassiveEvidenceType;
    readonly severity: PassiveEvidenceSeverity;
    readonly pageUrl?: string;
    readonly requestUrl?: string;
    readonly method?: string;
    readonly statusCode?: number;
    readonly message: string;
    readonly source?: string;
}

interface BiDiEventSource {
    on(eventName: string, listener: (event: unknown) => void): unknown;
    off(eventName: string, listener: (event: unknown) => void): unknown;
    sessionSubscribe(options: { events: string[] }): Promise<unknown>;
    sessionUnsubscribe?(options: { events: string[] }): Promise<unknown>;
    getUrl?(): Promise<string>;
}

interface EvidenceInput {
    type: PassiveEvidenceType;
    message: string;
    requestUrl?: string;
    method?: string;
    statusCode?: number;
    source?: string;
}

interface EvidenceContext {
    runId: string;
    scenarioId: string;
    scenarioName: string;
    pageUrl?: string;
}

interface PassiveObserverOptions {
    enabled: boolean;
    source: BiDiEventSource;
    storageDirectory?: string;
    writeEvidenceFile?: (filePath: string, contents: string) => Promise<void>;
    warn?: (message: string) => void;
    maxEvents?: number;
}

const OBSERVED_EVENTS = [
    'log.entryAdded',
    'network.fetchError',
    'network.responseCompleted',
    'browsingContext.navigationCommitted'
];
const MAX_MESSAGE_LENGTH = 2048;
const MAX_SOURCE_LENGTH = 512;
const MAX_SCENARIO_NAME_LENGTH = 160;
const DEFAULT_MAX_EVENTS = 200;

const SENSITIVE_ASSIGNMENT = /\b(password|passwd|token|access[_-]?token|refresh[_-]?token|authorization|cookie|api[_-]?key|secret|email|phone|mobile|first[_-]?name|last[_-]?name|full[_-]?name|postal[_-]?code|zip[_-]?code|ssn|address)\b["']?\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s&,;)}\]]+)/gi;
const EMAIL_ADDRESS = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER_TOKEN = /\bBearer\s+[A-Z0-9._~+/-]+=*/gi;
const JWT = /\beyJ[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\.[A-Z0-9_-]{5,}\b/gi;
const PHONE_NUMBER = /\b\+?\d[\d ().-]{7,}\d\b/g;
const URL_IN_TEXT = /https?:\/\/[^\s"'<>]+/gi;

export function sanitizeUrl(value: unknown): string | undefined {
    if (typeof value !== 'string' || value.length === 0) {
        return undefined;
    }

    try {
        const url = new URL(value);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return undefined;
        }
        url.username = '';
        url.password = '';
        url.search = '';
        url.hash = '';
        return url.toString().slice(0, MAX_MESSAGE_LENGTH);
    } catch {
        return value.split(/[?#]/, 1)[0].slice(0, MAX_MESSAGE_LENGTH) || undefined;
    }
}

export function redactSensitiveText(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
    if (typeof value !== 'string') {
        return '';
    }

    return value
        .replace(URL_IN_TEXT, (url) => sanitizeUrl(url) ?? '[REDACTED_URL]')
        .replace(BEARER_TOKEN, 'Bearer [REDACTED]')
        .replace(JWT, '[REDACTED_TOKEN]')
        .replace(SENSITIVE_ASSIGNMENT, '$1=[REDACTED]')
        .replace(EMAIL_ADDRESS, '[REDACTED_EMAIL]')
        .replace(PHONE_NUMBER, '[REDACTED_PHONE]')
        .slice(0, maxLength);
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
        ? value as Record<string, unknown>
        : {};
}

function eventParameters(event: unknown): Record<string, unknown> {
    const record = asRecord(event);
    return asRecord(record.params ?? event);
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
}

function normalizeRecord(input: EvidenceInput, context: EvidenceContext): PassiveEvidenceRecord | undefined {
    const message = redactSensitiveText(input.message);
    const requestUrl = sanitizeUrl(input.requestUrl);
    const source = redactSensitiveText(input.source, MAX_SOURCE_LENGTH) || undefined;

    if (!message && !requestUrl) {
        return undefined;
    }

    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        timestamp: now,
        lastSeenAt: now,
        occurrences: 1,
        runId: context.runId,
        scenarioId: context.scenarioId,
        scenarioName: context.scenarioName,
        type: input.type,
        severity: 'error',
        pageUrl: context.pageUrl,
        requestUrl,
        method: input.method?.slice(0, 16),
        statusCode: Number.isInteger(input.statusCode) ? input.statusCode : undefined,
        message,
        source
    };
}

export class PassiveObserver {
    private readonly enabled: boolean;
    private readonly source: BiDiEventSource;
    private readonly runId = randomUUID();
    private readonly storageDirectory: string;
    private readonly writeEvidenceFile: (filePath: string, contents: string) => Promise<void>;
    private readonly warn: (message: string) => void;
    private readonly maxEvents: number;
    private readonly listeners: Array<[string, (event: unknown) => void]> = [];
    private context?: EvidenceContext;
    private readonly records: PassiveEvidenceRecord[] = [];
    private readonly fingerprints = new Map<string, PassiveEvidenceRecord>();
    private subscribed = false;
    private disposed = false;
    private overflowWarned = false;

    public constructor(options: PassiveObserverOptions) {
        this.enabled = options.enabled;
        this.source = options.source;
        this.storageDirectory = options.storageDirectory
            ?? path.resolve(process.cwd(), 'artifacts', 'passive-evidence');
        this.writeEvidenceFile = options.writeEvidenceFile ?? this.writeToDisk;
        this.warn = options.warn ?? ((message) => console.warn(`[Passive Observer] ${message}`));
        this.maxEvents = Math.max(1, options.maxEvents ?? DEFAULT_MAX_EVENTS);
    }

    public async startScenario(scenarioName: string): Promise<boolean> {
        if (!this.enabled || this.disposed) {
            return false;
        }

        if (this.context) {
            this.warn('Previous scenario was not flushed; skipping observer initialization.');
            return false;
        }

        const context: EvidenceContext = {
            runId: this.runId,
            scenarioId: randomUUID(),
            scenarioName: redactSensitiveText(scenarioName, MAX_SCENARIO_NAME_LENGTH) || 'Unnamed scenario'
        };

        this.context = context;
        try {
            if (!this.subscribed) {
                this.installListeners();
                await this.source.sessionSubscribe({ events: OBSERVED_EVENTS });
                this.subscribed = true;
            }
        } catch {
            this.context = undefined;
            this.removeListeners();
            this.warn('Browser event collection is unavailable for this session.');
            return false;
        }

        if (this.source.getUrl) {
            try {
                context.pageUrl = sanitizeUrl(await this.source.getUrl());
            } catch {
                // Page URL is optional; event collection remains active.
            }
        }
        return true;
    }

    public async finishScenario(): Promise<string | undefined> {
        const context = this.context;
        if (!context) {
            return undefined;
        }

        this.context = undefined;
        if (this.source.getUrl) {
            try {
                context.pageUrl = sanitizeUrl(await this.source.getUrl()) ?? context.pageUrl;
            } catch {
                // The browser may already be closing; retain the last observed URL.
            }
        }

        const records = this.records.splice(0);
        this.fingerprints.clear();
        this.overflowWarned = false;
        if (records.length === 0) {
            return undefined;
        }

        for (const record of records) {
            if (!record.pageUrl && context.pageUrl) {
                Object.assign(record, { pageUrl: context.pageUrl });
            }
        }

        const filePath = path.join(this.storageDirectory, context.runId, `${context.scenarioId}.jsonl`);
        const contents = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;
        try {
            await this.writeEvidenceFile(filePath, contents);
            return filePath;
        } catch {
            this.warn('Evidence could not be written to the local artifact directory.');
            return undefined;
        }
    }

    public async dispose(): Promise<void> {
        if (this.disposed) {
            return;
        }
        await this.finishScenario();
        this.removeListeners();
        if (this.subscribed && this.source.sessionUnsubscribe) {
            try {
                await this.source.sessionUnsubscribe({ events: OBSERVED_EVENTS });
            } catch {
                this.warn('Browser event subscription could not be released before session shutdown.');
            }
        }
        this.subscribed = false;
        this.disposed = true;
    }

    private installListeners(): void {
        const handlers: Array<[string, (event: unknown) => void]> = [
            ['log.entryAdded', (event) => this.onLogEntry(event)],
            ['network.fetchError', (event) => this.onFetchError(event)],
            ['network.responseCompleted', (event) => this.onResponseCompleted(event)],
            ['browsingContext.navigationCommitted', (event) => this.onNavigation(event)]
        ];

        try {
            for (const [eventName, handler] of handlers) {
                this.source.on(eventName, handler);
                this.listeners.push([eventName, handler]);
            }
        } catch {
            this.removeListeners();
            throw new Error('BiDi event listener registration failed.');
        }
    }

    private removeListeners(): void {
        for (const [eventName, handler] of this.listeners.splice(0)) {
            try {
                this.source.off(eventName, handler);
            } catch {
                this.warn('A browser event listener could not be removed.');
            }
        }
    }

    private onLogEntry(event: unknown): void {
        try {
            const entry = eventParameters(event);
            if (stringValue(entry.level).toLowerCase() !== 'error') {
                return;
            }
            const eventType = stringValue(entry.type).toLowerCase();
            this.addEvidence({
                type: eventType === 'javascript' ? 'javascript-exception' : 'console-error',
                message: eventType === 'javascript'
                    ? 'Browser reported a JavaScript exception.'
                    : 'Browser console reported an error.'
            });
        } catch {
            this.warn('A browser log event could not be normalized.');
        }
    }

    private onFetchError(event: unknown): void {
        try {
            const params = eventParameters(event);
            const request = asRecord(params.request);
            this.addEvidence({
                type: 'network-failure',
                message: stringValue(params.errorText) || 'Network request failed.',
                requestUrl: stringValue(request.url),
                method: stringValue(request.method)
            });
        } catch {
            this.warn('A failed network event could not be normalized.');
        }
    }

    private onResponseCompleted(event: unknown): void {
        try {
            const params = eventParameters(event);
            const request = asRecord(params.request);
            const response = asRecord(params.response);
            const statusCode = Number(response.status);
            if (!Number.isInteger(statusCode) || statusCode < 400) {
                return;
            }
            this.addEvidence({
                type: 'http-error',
                message: `HTTP response status ${statusCode}.`,
                requestUrl: stringValue(request.url),
                method: stringValue(request.method),
                statusCode
            });
        } catch {
            this.warn('An HTTP response event could not be normalized.');
        }
    }

    private onNavigation(event: unknown): void {
        try {
            const params = eventParameters(event);
            const url = sanitizeUrl(params.url);
            if (this.context && url) {
                this.context.pageUrl = url;
            }
        } catch {
            this.warn('A navigation event could not be normalized.');
        }
    }

    private addEvidence(input: EvidenceInput): void {
        if (!this.context) {
            return;
        }

        const record = normalizeRecord(input, this.context);
        if (!record) {
            return;
        }

        const fingerprint = createHash('sha256')
            .update(JSON.stringify([
                record.type,
                record.requestUrl,
                record.method,
                record.statusCode,
                record.message,
                record.source
            ]))
            .digest('hex');
        const duplicate = this.fingerprints.get(fingerprint);
        if (duplicate) {
            duplicate.occurrences = Math.min(999, duplicate.occurrences + 1);
            duplicate.lastSeenAt = record.timestamp;
            return;
        }

        if (this.records.length >= this.maxEvents) {
            if (!this.overflowWarned) {
                this.warn('Scenario evidence limit reached; additional events are being dropped.');
                this.overflowWarned = true;
            }
            return;
        }

        this.records.push(record);
        this.fingerprints.set(fingerprint, record);
    }

    private async writeToDisk(filePath: string, contents: string): Promise<void> {
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, contents, { encoding: 'utf8', flag: 'wx' });
    }
}