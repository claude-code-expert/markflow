declare module 'unzipper' {
  interface File {
    path: string;
    type: 'File' | 'Directory';
    buffer(): Promise<Buffer>;
  }

  interface Directory {
    files: File[];
  }

  interface OpenStatic {
    buffer(buffer: Buffer): Promise<Directory>;
  }

  export const Open: OpenStatic;
}
