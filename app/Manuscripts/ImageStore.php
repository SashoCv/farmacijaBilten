<?php

namespace App\Manuscripts;

use App\Models\Manuscript;
use App\Models\ManuscriptImage;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Stores a figure image for a manuscript. Every image is decoded and encoded
 * again with GD, which drops EXIF/XMP/IPTC and PNG text chunks (camera,
 * author names, GPS) and anything that is not a real image. JPEG stays JPEG
 * (photos); PNG, WebP and GIF become PNG (charts, chromatograms, formulae).
 */
final class ImageStore
{
    public const MAX_KB = 15360;

    /** Longest side kept: about 300 dpi across the 160 mm text block, with room to spare. */
    private const MAX_SIDE = 4000;

    public function store(Manuscript $manuscript, UploadedFile $file, User $user): ManuscriptImage
    {
        $source = (string) $file->getRealPath();
        $info = @getimagesize($source);

        if ($info === false || ! in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_GIF], true)) {
            throw ValidationException::withMessages(['image' => __('Upload a PNG or JPEG image.')]);
        }

        $image = match ($info[2]) {
            IMAGETYPE_JPEG => @imagecreatefromjpeg($source),
            IMAGETYPE_PNG => @imagecreatefrompng($source),
            IMAGETYPE_WEBP => @imagecreatefromwebp($source),
            default => @imagecreatefromgif($source),
        };

        if ($image === false) {
            throw ValidationException::withMessages(['image' => __('The image could not be read.')]);
        }

        $image = $this->orient($image, $info[2] === IMAGETYPE_JPEG ? $source : null);
        $image = $this->limit($image);

        $jpeg = $info[2] === IMAGETYPE_JPEG;
        $extension = $jpeg ? 'jpg' : 'png';
        $path = "manuscripts/{$manuscript->public_id}/images/".Str::ulid()->toBase32().".{$extension}";

        ob_start();
        $jpeg ? imagejpeg($image, null, 92) : (imagesavealpha($image, true) && imagepng($image, null, 6));
        $bytes = (string) ob_get_clean();

        Storage::disk('local')->put($path, $bytes);

        return $manuscript->images()->create([
            'path' => $path,
            'mime' => $jpeg ? 'image/jpeg' : 'image/png',
            'width' => imagesx($image),
            'height' => imagesy($image),
            'bytes' => strlen($bytes),
            'uploaded_by' => $user->id,
        ]);
    }

    /** Phone photos carry their rotation in EXIF; apply it before EXIF is dropped. */
    private function orient(\GdImage $image, ?string $jpegPath): \GdImage
    {
        if ($jpegPath === null || ! function_exists('exif_read_data')) {
            return $image;
        }

        $exif = @exif_read_data($jpegPath);
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
        $angle = match ($orientation) {
            3 => 180,
            6 => -90,
            8 => 90,
            default => 0,
        };

        return $angle === 0 ? $image : (imagerotate($image, $angle, 0) ?: $image);
    }

    private function limit(\GdImage $image): \GdImage
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $longest = max($width, $height);

        if ($longest <= self::MAX_SIDE) {
            return $image;
        }

        $scale = self::MAX_SIDE / $longest;

        return imagescale($image, (int) round($width * $scale), (int) round($height * $scale), IMG_BICUBIC) ?: $image;
    }
}
