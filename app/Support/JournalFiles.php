<?php

namespace App\Support;

final class JournalFiles
{
    /**
     * Public URL of a file on the "journal" disk. The disk's top folders
     * (volumes, downloads, media) are symlinked into public/, so files are
     * served statically at the same paths the old site used.
     */
    public static function url(?string $path): ?string
    {
        if ($path === null || $path === '') {
            return null;
        }

        return '/'.implode('/', array_map(rawurlencode(...), explode('/', $path)));
    }
}
