import type { CvExtraction } from '@workspace/api-client-react';

type SendCv = (data: { file: Blob }, options: { signal: AbortSignal }) => Promise<CvExtraction>;

/** Snapshot the bounded local file before fetch instead of streaming an OS-backed
 * File, which can become unavailable after selection (cloud files, temporary
 * files, or files replaced on disk). Never put the bytes in a query cache. */
export async function uploadCvFile(file: File, signal: AbortSignal, send: SendCv): Promise<CvExtraction> {
  let bytes: ArrayBuffer;
  try {
    bytes = await file.arrayBuffer();
    if (bytes.byteLength !== file.size) throw new Error('File changed');
  } catch {
    if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
    throw new Error('Your browser could not read the selected file. Save a local copy of the PDF or DOCX, choose it again, then click Extract skills.');
  }
  if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
  const snapshot = new File([bytes], file.name, { type: file.type || 'application/octet-stream' });
  try {
    return await send({ file: snapshot }, { signal });
  } catch (error) {
    if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
    if (error instanceof TypeError) {
      throw new Error('Your browser read the file, but the upload failed before a response was received. This is a connection or browser upload error, not a CV parsing result. Check your connection, choose a local copy of the file and retry Extract skills.');
    }
    // Preserve actionable server errors (unsupported files, scanned PDFs, limits).
    throw error;
  }
}
