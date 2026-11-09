<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * The editorial office's own wording of one e-mail in one language.
 *
 * @property int $id
 * @property string $key
 * @property string $locale
 * @property string $subject
 * @property string $body
 * @property int|null $updated_by
 * @property Carbon|null $updated_at
 */
class MailTemplate extends Model
{
    protected $guarded = ['id'];
}
