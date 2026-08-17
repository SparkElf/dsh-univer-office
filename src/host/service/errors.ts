/** Stable Univer domain error that wire and tool consumers can classify. */
export class UniverError extends Error {
  /** Stable machine-readable failure code. */
  readonly code: string

  /** Create a classified Univer error. */
  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'UniverError'
    this.code = code
  }
}
