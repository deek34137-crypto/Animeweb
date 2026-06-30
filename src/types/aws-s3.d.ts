// src/types/aws-s3.d.ts
declare module '@aws-sdk/client-s3' {
  export class S3Client {
    constructor(config: any);
    send(command: any): Promise<any>;
  }
  export class HeadBucketCommand {
    constructor(input: { Bucket: string });
  }
}
