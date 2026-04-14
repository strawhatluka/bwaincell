import { GoogleDriveClient, googleDrive } from '@/lib/google/drive';

jest.mock('next-auth/react', () => ({ getSession: jest.fn() }));

describe('GoogleDriveClient (stub)', () => {
  const client = new GoogleDriveClient();

  it('listFiles throws not implemented', async () => {
    await expect(client.listFiles()).rejects.toThrow(/not yet implemented/);
    await expect(client.listFiles({ pageSize: 10 })).rejects.toThrow(/not yet implemented/);
  });

  it('getFile throws not implemented', async () => {
    await expect(client.getFile('id')).rejects.toThrow(/not yet implemented/);
    await expect(client.getFile('id', 'name')).rejects.toThrow(/not yet implemented/);
  });

  it('downloadFile throws not implemented', async () => {
    await expect(client.downloadFile('id')).rejects.toThrow(/not yet implemented/);
  });

  it('createFolder throws not implemented', async () => {
    await expect(client.createFolder('name')).rejects.toThrow(/not yet implemented/);
    await expect(client.createFolder('name', 'parent')).rejects.toThrow(/not yet implemented/);
  });

  it('uploadFile throws not implemented', async () => {
    await expect(
      client.uploadFile({
        name: 'n',
        content: new globalThis.Blob(['x']),
        mimeType: 'text/plain',
      })
    ).rejects.toThrow(/not yet implemented/);
  });

  it('deleteFile throws not implemented', async () => {
    await expect(client.deleteFile('id')).rejects.toThrow(/not yet implemented/);
  });

  it('exports a default instance', () => {
    expect(googleDrive).toBeInstanceOf(GoogleDriveClient);
  });
});
