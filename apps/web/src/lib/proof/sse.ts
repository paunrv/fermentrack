export function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function createSseStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  const send = (event: string, data: unknown) => {
    controller?.enqueue(encoder.encode(sseEncode(event, data)))
  }

  const close = () => {
    controller?.close()
  }

  return { stream, send, close }
}
