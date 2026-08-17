import * as React from 'react';
import type { WorktreeState } from '../../shared/wire/state.ts';
import type { Translate } from '../dsh.ts';
/** Live floating Viewer window for one active worktree. */
export declare function WorktreeWindow(props: {
    readonly file: string;
    readonly worktree: WorktreeState;
    readonly t: Translate;
    readonly onDismiss: () => void;
}): React.ReactElement;
//# sourceMappingURL=worktree-window.d.ts.map