<?php

namespace App\Journal\Seo\Oai;

use RuntimeException;

/**
 * An OAI-PMH error condition (badArgument, idDoesNotExist, ...), reported in
 * the response body with HTTP 200 as the protocol requires.
 */
final class OaiError extends RuntimeException
{
    public function __construct(public readonly string $oaiCode, string $message)
    {
        parent::__construct($message);
    }
}
