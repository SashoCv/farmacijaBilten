<?php

namespace App\Http\Controllers;

use App\Journal\Seo\Sitemap;
use Illuminate\Http\Response;

/**
 * XML sitemaps: /sitemap.xml (index) and /sitemaps/{pages|issues|articles}.xml.
 */
class SitemapController extends Controller
{
    public const TYPES = Sitemap::TYPES;

    public function index(): Response
    {
        return $this->xml(Sitemap::index());
    }

    public function show(string $type): Response
    {
        return $this->xml(Sitemap::document($type));
    }

    private function xml(string $body): Response
    {
        return response($body, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age='.Sitemap::TTL,
            'X-Robots-Tag' => 'noindex',
        ]);
    }
}
