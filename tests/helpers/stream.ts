export function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index++]));
    },
  });
}

export function responseFromChunks(chunks: string[], init?: ResponseInit): Response {
  return new Response(streamFromChunks(chunks), {
    status: 200,
    ...init,
  });
}
