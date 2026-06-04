export function sseEncode(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export function createSseStream() {
  const encoder = new TextEncoder()
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null

  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
    },
  })

  const send = (event: string, data: unknown) => {
    if (closed || !controller) return
    try {
      controller.enqueue(encoder.encode(sseEncode(event, data)))
    } catch {
      closed = true
    }
  }

  const close = () => {
    if (closed || !controller) return
    closed = true
    try {
      controller.close()
    } catch {
      /* ya cerrado */
    }
  }

  return { stream, send, close }
}
