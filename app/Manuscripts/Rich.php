<?php

namespace App\Manuscripts;

/**
 * Helpers for the TipTap (ProseMirror) JSON documents in a manuscript.
 */
final class Rich
{
    /** Plain text of a document or node; blocks are separated by a space. */
    public static function text(mixed $node): string
    {
        if (! is_array($node)) {
            return '';
        }

        if (($node['type'] ?? null) === 'text') {
            return is_string($node['text'] ?? null) ? $node['text'] : '';
        }

        if (($node['type'] ?? null) === 'hardBreak') {
            return ' ';
        }

        $parts = [];

        foreach ((array) ($node['content'] ?? []) as $child) {
            $parts[] = self::text($child);
        }

        $inline = in_array($node['type'] ?? null, ['paragraph', 'heading', 'tableCaption', 'tableNote', 'figureCaption'], true);

        return trim(implode($inline ? '' : ' ', $parts));
    }

    public static function isEmpty(mixed $node): bool
    {
        return trim(self::text($node)) === '' && self::count($node, 'tableBlock') === 0 && self::count($node, 'figure') === 0;
    }

    public static function words(mixed $node): int
    {
        $text = trim(self::text($node));

        return $text === '' ? 0 : count(preg_split('/\s+/u', $text) ?: []);
    }

    /** How many nodes of a type the document contains. */
    public static function count(mixed $node, string $type): int
    {
        if (! is_array($node)) {
            return 0;
        }

        $count = ($node['type'] ?? null) === $type ? 1 : 0;

        foreach ((array) ($node['content'] ?? []) as $child) {
            $count += self::count($child, $type);
        }

        return $count;
    }

    /**
     * Visit every node of a type, depth first.
     *
     * @param  callable(array<string, mixed>): void  $visit
     */
    public static function each(mixed $node, string $type, callable $visit): void
    {
        if (! is_array($node)) {
            return;
        }

        if (($node['type'] ?? null) === $type) {
            $visit($node);
        }

        foreach ((array) ($node['content'] ?? []) as $child) {
            self::each($child, $type, $visit);
        }
    }

    /**
     * The paragraphs of a document, as plain text (e.g. one per reference).
     *
     * @return list<string>
     */
    public static function paragraphs(mixed $doc): array
    {
        $out = [];

        foreach ((array) (is_array($doc) ? ($doc['content'] ?? []) : []) as $block) {
            if (is_array($block) && ($block['type'] ?? null) === 'paragraph') {
                $text = trim(self::text($block));

                if ($text !== '') {
                    $out[] = $text;
                }
            }
        }

        return $out;
    }
}
