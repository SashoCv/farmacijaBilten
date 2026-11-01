<?php

namespace App\Http\Controllers;

use App\Journal\Seo\Oai\OaiPmh;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;

/**
 * OAI-PMH 2.0 endpoint at /oai (GET and POST), for harvesters such as BASE,
 * CORE and OpenAIRE. Protocol errors are part of a 200 response.
 */
class OaiController extends Controller
{
    public function __invoke(Request $request, OaiPmh $oai): Response
    {
        [$args, $repeated] = $this->arguments($request);

        // Metadata is published in English whatever the visitor's language cookie.
        $locale = App::getLocale();
        App::setLocale('en');

        try {
            $body = view('oai.response', $oai->handle($args, $repeated))->render();
        } finally {
            App::setLocale($locale);
        }

        return response($body, 200, [
            'Content-Type' => 'text/xml; charset=UTF-8',
            'X-Robots-Tag' => 'noindex',
        ]);
    }

    /**
     * Arguments from the raw query string (GET) or form body (POST), so that a
     * repeated argument can be reported as badArgument (PHP would keep only
     * the last value).
     *
     * @return array{0: array<string, string>, 1: bool}
     */
    private function arguments(Request $request): array
    {
        $raw = $request->isMethod('POST')
            ? $request->getContent()
            : $request->server->getString('QUERY_STRING');

        if ($request->isMethod('POST') && $raw === '') {
            // Body already parsed (e.g. in tests): no way to see repeats.
            return [array_map('strval', array_filter($request->post(), 'is_scalar')), false];
        }

        $args = [];
        $repeated = false;

        foreach (explode('&', $raw) as $pair) {
            if ($pair === '') {
                continue;
            }

            [$key, $value] = array_pad(explode('=', $pair, 2), 2, '');
            $key = urldecode($key);

            $repeated = $repeated || array_key_exists($key, $args);
            $args[$key] = urldecode($value);
        }

        return [$args, $repeated];
    }
}
