/** Figure constants and types, shared by the extension and its node view. */

export type FigureWidth = 25 | 50 | 75 | 100;

export const FIGURE_WIDTHS: FigureWidth[] = [25, 50, 75, 100];

export const FIGURE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
];

export const FIGURE_MAX_BYTES = 15 * 1024 * 1024;

export type UploadedImage = {
    id: string;
    url: string;
    width: number;
    height: number;
};

export type FigureOptions = {
    /** Uploads a file; rejects with a translated message. */
    upload: (
        file: File,
        onProgress: (fraction: number) => void,
    ) => Promise<UploadedImage>;
    /** URL of a stored image. */
    imageUrl: (id: string) => string;
    /** Translated message for a file the server would refuse anyway. */
    rejectFile: (file: File) => string | null;
};
