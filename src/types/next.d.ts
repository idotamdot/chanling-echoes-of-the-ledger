declare module 'next' {
  export interface Metadata {
    title?: string;
    description?: string;
    [key: string]: unknown;
  }
}

declare module 'next/server' {
  export class NextRequest extends Request {
    readonly nextUrl: URL;
  }

  export class NextResponse extends Response {
    static json<T = unknown>(data: T, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, status?: number): NextResponse;
  }
}
