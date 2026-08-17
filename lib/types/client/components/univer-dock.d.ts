import * as React from 'react';
import type { Translate, SessionSnapshot } from '../dsh.ts';
/** Props supplied by the DSH conversation input dock. */
export interface UniverDockProps {
    readonly sessionId: string;
    readonly session?: SessionSnapshot;
    readonly t: Translate;
    readonly useSessions?: (selector: (state: {
        readonly byId: Record<string, {
            readonly cwd?: string;
        }>;
    }) => string | undefined) => string | undefined;
}
/** Project active worktrees into live windows or idle-session review panels. */
export declare function UniverDock(props: UniverDockProps): React.ReactElement;
//# sourceMappingURL=univer-dock.d.ts.map