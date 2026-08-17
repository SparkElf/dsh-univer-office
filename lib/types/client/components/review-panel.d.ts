import * as React from 'react';
import type { FileState, WorktreeState } from '../../shared/wire/state.ts';
import type { Translate } from '../dsh.ts';
/** Session-end review panel for a draft or ready worktree. */
export declare function ReviewPanel(props: {
    readonly sessionId: string;
    readonly file: string;
    readonly worktree: WorktreeState;
    readonly t: Translate;
    readonly applyState: (state: FileState) => void;
}): React.ReactElement;
//# sourceMappingURL=review-panel.d.ts.map