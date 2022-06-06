import * as fs from 'fs';
import { Injectable, StreamableFile } from '@nestjs/common';
import { IPFSHTTPClient } from 'ipfs-http-client/types/src/types';
import { JsonDB } from 'node-json-db';
import { Config } from 'node-json-db/dist/lib/JsonDBConfig';
import { create } from 'ipfs-http-client';
import { createReadStream } from 'fs';
import { FileDataDto } from './dto/file-data.dto';
import { FileData } from './schemas/file-data.interface';
import { concat as uint8ArrayConcat } from 'uint8arrays/concat';

import { MetadataDto} from './dto/metadata.dto';


const DB_PATH = '../db/db.json';
@Injectable()
export class AppService {
  ipfsClient: IPFSHTTPClient;
  db: JsonDB;
  lastId: number;

  constructor() {
    this.db = new JsonDB(new Config(DB_PATH, true, true, '/'));
    this.ipfsClient = create({
      host: '127.0.0.1',
      port: 5001,
      protocol: 'http',
    });
    const data = this.db.getData('/');
    this.lastId =
      data && Object.keys(data).length > 0
        ? Math.max(...Object.keys(data).map((key) => Number(key)))
        : -1;
  }

  isIpfsNodeOnline() {
    try {
      return this.ipfsClient.isOnline();
    } catch (error) {
      return error;
    }
  }

  pushFile(file: FileDataDto) {
    const obj = new FileData(file);
    const fileId = ++this.lastId;
    this.db.push(`/${fileId}`, obj);
    return fileId;
  }

  getAll() {
    return this.db.getData('/');
  }

  get(fileId: number) {
    return this.db.getData(`/${fileId}`);
  }

  getFileStream(filename: string) {
    const fileStream = createReadStream(`../upload/${filename}`);
    return new StreamableFile(fileStream);
  }

  async getFromIpfs(fileId: number) {
    const fileData: FileData = this.get(fileId);
    if (!fileData.ipfs || !fileData.ipfs.path || fileData.ipfs.path.length == 0)
      throw new Error('File not found');
    const ipfsBytes = this.ipfsClient.cat(fileData.ipfs.path);
    const content = [];
    for await (const chunk of ipfsBytes) {
      content.push(chunk);
    }
    const fileStream = uint8ArrayConcat(content);
    return new StreamableFile(fileStream);
  }


  setMetadata(fileId: number, metadata: MetadataDto) {
    let file: any;
    try {
      file = this.db.getData(`/${fileId}/file`);
    } catch (error) {
      return { error };
    }
    if (!file) return false;
    this.db.push(`/${fileId}/metadata`, metadata);
    return this.get(fileId);
  }

  getMetadataById(fileId: number) {
    const fileData: FileData = this.get(fileId);
    return fileData.metadata;
  }

  async saveToIpfs(fileId: number) {
    const fileData: FileData = this.get(fileId);
    const fileLocation = `../upload/${fileData.file.storageName}`;
    const fileBytes = fs.readFileSync(fileLocation);
    const ipfsData = await this.ipfsClient.add(fileBytes);
    this.db.push(`/${fileId}/ipfs`, ipfsData);
    return this.get(fileId);
  }

}
