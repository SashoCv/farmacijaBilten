<?php

namespace App\Journal\Seo\Oai;

/**
 * Stateless resumption tokens: the list request and the offset of the next
 * page, base64url-encoded JSON. Nothing is stored on the server, so tokens do
 * not expire; a changed catalogue only shifts the page boundaries.
 */
final class Token
{
    /**
     * @param  array{prefix: string, set: string|null, from: string|null, until: string|null, offset: int}  $state
     */
    public static function encode(array $state): string
    {
        $json = json_encode([$state['prefix'], $state['set'], $state['from'], $state['until'], $state['offset']]);

        return rtrim(strtr(base64_encode((string) $json), '+/', '-_'), '=');
    }

    /**
     * @return array{prefix: string, set: string|null, from: string|null, until: string|null, offset: int}
     */
    public static function decode(string $token): array
    {
        $json = base64_decode(strtr($token, '-_', '+/'), true);
        $data = $json === false ? null : json_decode($json, true);

        if (! is_array($data) || count($data) !== 5 || ! array_is_list($data)) {
            throw self::invalid();
        }

        [$prefix, $set, $from, $until, $offset] = $data;

        $optional = fn ($v) => $v === null || is_string($v);

        if (! is_string($prefix) || ! isset(OaiPmh::FORMATS[$prefix])
            || ! $optional($set) || ! $optional($from) || ! $optional($until)
            || ! is_int($offset) || $offset < 1
            || ($from !== null && ! OaiPmh::parseDate($from, false))
            || ($until !== null && ! OaiPmh::parseDate($until, true))) {
            throw self::invalid();
        }

        return ['prefix' => $prefix, 'set' => $set, 'from' => $from, 'until' => $until, 'offset' => $offset];
    }

    private static function invalid(): OaiError
    {
        return new OaiError('badResumptionToken', 'The resumption token is invalid or has expired.');
    }
}
