/** Stable Univer domain error that wire and tool consumers can classify. */
export declare class UniverError extends Error {
    /** Stable machine-readable failure code. */
    readonly code: string;
    /** Create a classified Univer error. */
    constructor(message: string, code: string, options?: ErrorOptions);
}
//# sourceMappingURL=errors.d.ts.map