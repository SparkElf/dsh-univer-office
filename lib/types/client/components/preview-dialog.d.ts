import * as React from 'react';
import type { Translate } from '../dsh.ts';
/** Fullscreen in-app Viewer dialog. */
export declare function PreviewDialog(props: {
    readonly file: string;
    readonly worktreeId: string | null;
    readonly url: string;
    readonly t: Translate;
    readonly onClose: () => void;
}): React.ReactElement;
/** Univer grid glyph without an icon-package dependency. */
export declare function GridIcon({ size }: {
    readonly size: number;
}): React.ReactElement;
//# sourceMappingURL=preview-dialog.d.ts.map