<?php

namespace App\Models;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * A member of the editorial board (`BoardMember` in resources/js/types/journal.ts).
 *
 * Seeded by database/seeders/BoardMemberSeeder.php from the imported
 * editorial-board page (see parseHtml()). Roles, titles and the member list
 * are as last published on the old site and are TO CONFIRM by the editors.
 *
 * @property int $id
 * @property string $group "editor-in-chief" | "secretary" | "international" | ...
 * @property string|null $role Role shown on the card (TO CONFIRM by the editors).
 * @property int $position
 * @property string|null $title Academic title, e.g. "Prof. Dr."
 * @property string $given_name
 * @property string $family_name
 * @property string|null $affiliation
 * @property string|null $city
 * @property string|null $country
 * @property string|null $orcid
 * @property string|null $email
 * @property string|null $photo Public path of a portrait.
 */
class BoardMember extends Model
{
    public const GROUP_EDITOR_IN_CHIEF = 'editor-in-chief';

    public const GROUP_SECRETARY = 'secretary';

    public const GROUP_INTERNATIONAL = 'international';

    /** Display order of the groups. */
    public const GROUPS = [self::GROUP_EDITOR_IN_CHIEF, self::GROUP_SECRETARY, self::GROUP_INTERNATIONAL];

    /** Role headings on the old page → group. */
    private const HEADINGS = [
        'editor-in-chief' => self::GROUP_EDITOR_IN_CHIEF,
        'secretary' => self::GROUP_SECRETARY,
        'international editorial board' => self::GROUP_INTERNATIONAL,
    ];

    /** Spelling fixes and current names for countries as written on the old page. */
    private const COUNTRIES = [
        'Macedonia' => 'North Macedonia',
        'Demark' => 'Denmark',
    ];

    /**
     * Names the "Family Given" rule cannot split: the whole source string →
     * [given, family]. Only the order changes, never the spelling.
     */
    private const NAMES = [
        'Cavaco Afonso Miguel das Neves' => ['Afonso Miguel das Neves', 'Cavaco'],
    ];

    /** Cities the address line does not give cleanly ("06100 Sıhhiye Ankara"). */
    private const CITIES = [
        'Sıhhiye Ankara' => 'Ankara',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
        ];
    }

    /**
     * Groups in display order (as in GROUPS), members in position order.
     *
     * @param  Builder<BoardMember>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        // "group" is a reserved word. Backticks quote it on both MySQL and SQLite;
        // double quotes would be a string literal on MySQL.
        $query->orderByRaw(
            "case `group` when 'editor-in-chief' then 0 when 'secretary' then 1 when 'international' then 2 else 99 end",
        )->orderBy('position')->orderBy('family_name');
    }

    /**
     * @return array<string, mixed>
     */
    public function present(): array
    {
        return [
            'id' => $this->id,
            'group' => $this->group,
            'role' => $this->role,
            'position' => $this->position,
            'title' => $this->title,
            'givenName' => $this->given_name,
            'familyName' => $this->family_name,
            'name' => trim("{$this->given_name} {$this->family_name}"),
            'affiliation' => $this->affiliation,
            'city' => $this->city,
            'country' => $this->country,
            'orcid' => $this->orcid,
            'email' => $this->email,
            'photo' => $this->photo ? '/'.ltrim($this->photo, '/') : null,
        ];
    }

    /**
     * Parses the old editorial-board page: one paragraph per person,
     * `<strong>Role</strong><br><em>Name</em><br>Affiliation…<br>Street, Postcode City, Country`.
     *
     * Names under Editor-in-Chief and Secretary are written "Given Family"; the
     * international board lists them "Family Given" (the last word is the given
     * name). Street addresses are dropped; only the city and country are kept.
     * Academic titles, ORCIDs, e-mails and photos are not on the page and stay null.
     *
     * @return list<array{group: string, role: string, position: int, given_name: string, family_name: string, affiliation: string|null, city: string|null, country: string|null}>
     */
    public static function parseHtml(string $html): array
    {
        $doc = new DOMDocument;
        $doc->loadHTML('<?xml encoding="utf-8"?><div>'.$html.'</div>', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);

        $members = [];
        $group = null;
        $role = null;
        $positions = [];

        foreach ($doc->getElementsByTagName('p') as $p) {
            /** @var DOMElement $p */
            $heading = null;
            $name = null;
            $lines = [];

            foreach (self::lines($p) as $line) {
                $text = self::clean(implode('', array_map(fn (DOMNode $n) => $n->textContent, $line)));

                if ($text === '') {
                    continue;
                }

                $tag = self::wrapper($line);

                if ($heading === null && $name === null && in_array($tag, ['strong', 'b'], true)) {
                    $heading = $text;
                } elseif ($name === null && in_array($tag, ['em', 'i'], true)) {
                    $name = $text;
                } elseif ($name !== null) {
                    $lines[] = $text;
                }
            }

            if ($heading !== null && isset(self::HEADINGS[mb_strtolower($heading)])) {
                $group = self::HEADINGS[mb_strtolower($heading)];
                $role = $heading;
            }

            if ($name === null || $group === null) {
                continue;
            }

            [$given, $family] = self::splitName($name, $group !== self::GROUP_INTERNATIONAL);
            [$affiliation, $city, $country] = self::splitAddress($lines);

            $positions[$group] = ($positions[$group] ?? 0) + 1;

            $members[] = [
                'group' => $group,
                'role' => $role,
                'position' => $positions[$group],
                'given_name' => $given,
                'family_name' => $family,
                'affiliation' => $affiliation,
                'city' => $city,
                'country' => $country,
            ];
        }

        return $members;
    }

    /**
     * @return array{0: string, 1: string}
     */
    private static function splitName(string $name, bool $givenFirst): array
    {
        if (isset(self::NAMES[$name])) {
            return self::NAMES[$name];
        }

        $words = preg_split('/\s+/u', $name) ?: [$name];

        if (count($words) < 2) {
            return ['', $name];
        }

        return $givenFirst
            ? [$words[0], implode(' ', array_slice($words, 1))]
            : [(string) end($words), implode(' ', array_slice($words, 0, -1))];
    }

    /**
     * Affiliation lines, then the address; the last line ends in the country
     * (or a US state and ZIP code).
     *
     * @param  list<string>  $lines
     * @return array{0: string|null, 1: string|null, 2: string|null}
     */
    private static function splitAddress(array $lines): array
    {
        if ($lines === []) {
            return [null, null, null];
        }

        $address = array_pop($lines);
        $segments = array_map('trim', explode(',', $address));
        $last = (string) array_pop($segments);

        if (preg_match('/^[A-Z]{2}\s+\d{5}$/', $last)) {
            // "Boston, MA 02115"
            $country = 'United States';
        } else {
            $country = self::COUNTRIES[$last] ?? $last;
        }

        $city = null;

        foreach ($segments as $segment) {
            // "1000 Skopje", "SI-1000 Ljubljana", "106 91 Stockholm", "1749-019 Lisboa"
            if (preg_match('/^(?:[A-Z]{1,2}-)?\d[\d\s-]*\s+(\D.*)$/u', $segment, $m)) {
                $city = $m[1];
            }
        }

        if ($city === null) {
            foreach ($segments as $segment) {
                // "Tirana 1000"
                if (preg_match('/^(\D+?)\s+\d{3,}$/u', $segment, $m) && ! preg_match('/\d/', $m[1])) {
                    $city = $m[1];
                }
            }
        }

        $city ??= $segments !== [] ? end($segments) : null;
        $city = $city !== null ? (self::CITIES[$city] ?? $city) : null;

        // Street lines ("75 Francis Street, Amory 215A") are not affiliations.
        $affiliation = collect($lines)
            ->reject(fn (string $line) => (bool) preg_match('/^\d/u', $line))
            ->reduce(function (?string $carry, string $line) {
                if ($carry === null) {
                    return $line;
                }

                // "Institute of Organic Chemistry with" + "Centre of Phytochemistry"
                return preg_match('/\b(with|of|and|for)$/u', $carry) ? "{$carry} {$line}" : "{$carry}, {$line}";
            });

        return [$affiliation, $city, $country];
    }

    /**
     * Child nodes of an element split at <br>s, at any depth of inline wrappers
     * (the old page puts the <br> inside the <em>: "<em>Name<br></em>").
     *
     * @return list<list<DOMNode>>
     */
    private static function lines(DOMElement $p): array
    {
        $lines = [[]];

        $walk = function (DOMNode $node, ?DOMElement $wrapper) use (&$walk, &$lines): void {
            foreach ($node->childNodes as $child) {
                if ($child instanceof DOMElement && $child->tagName === 'br') {
                    $lines[] = [];

                    continue;
                }

                if ($child instanceof DOMElement && in_array($child->tagName, ['strong', 'b', 'em', 'i', 'span'], true)) {
                    $walk($child, in_array($child->tagName, ['span'], true) ? $wrapper : $child);

                    continue;
                }

                if ($child instanceof DOMText || $child instanceof DOMElement) {
                    // Keep the wrapping tag with the text, so wrapper() can tell names from headings.
                    $copy = $wrapper?->cloneNode(false);
                    $inner = $child->cloneNode(true);

                    if ($copy instanceof DOMNode && $inner instanceof DOMNode) {
                        $copy->appendChild($inner);
                        $lines[array_key_last($lines)][] = $copy;
                    } else {
                        $lines[array_key_last($lines)][] = $child;
                    }
                }
            }
        };

        $walk($p, null);

        return $lines;
    }

    /**
     * The inline element wrapping a whole line, if any ("strong", "em").
     *
     * @param  list<DOMNode>  $line
     */
    private static function wrapper(array $line): ?string
    {
        $tags = [];

        foreach ($line as $node) {
            if ($node instanceof DOMText && trim($node->data) === '') {
                continue;
            }

            $tags[] = $node instanceof DOMElement ? $node->tagName : null;
        }

        $tags = array_unique($tags);

        return count($tags) === 1 ? $tags[0] : null;
    }

    private static function clean(string $text): string
    {
        $text = \Normalizer::normalize($text, \Normalizer::FORM_C) ?: $text;
        // "Panc̆ić": a combining breve where the caron belongs.
        $text = str_replace(['c̆', "c\u{0306}"], 'č', $text);

        return trim((string) preg_replace('/[\s\x{00A0}]+/u', ' ', Str::of($text)->toString()));
    }
}
