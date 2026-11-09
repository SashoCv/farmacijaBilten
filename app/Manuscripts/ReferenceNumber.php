<?php

namespace App\Manuscripts;

use DateTimeInterface;
use Illuminate\Support\Facades\DB;

/**
 * "MPB-2026-0042": the editorial reference of a manuscript, numbered per year
 * and shared by the website form and the manuscript system, so a number is
 * never given twice.
 */
final class ReferenceNumber
{
    public static function next(?DateTimeInterface $date = null): string
    {
        $year = (int) ($date ?? now())->format('Y');

        return DB::transaction(function () use ($year) {
            DB::table('reference_sequences')->insertOrIgnore(['year' => $year, 'last' => 0]);
            DB::table('reference_sequences')->where('year', $year)->increment('last');
            $last = (int) DB::table('reference_sequences')->where('year', $year)->value('last');

            return sprintf('MPB-%d-%04d', $year, $last);
        });
    }
}
