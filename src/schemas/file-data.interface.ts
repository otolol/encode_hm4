import { FileDataDto } from 'src/dto/file-data.dto';
import { IpfsDataDto } from 'src/dto/ipfs-data.dto';
import { MetadataDto } from 'src/dto/metadata.dto';

export class FileData {
  constructor(
    public file?: FileDataDto,
    public metadata?: MetadataDto,
    public ipfs?: IpfsDataDto,
  ) {}
}