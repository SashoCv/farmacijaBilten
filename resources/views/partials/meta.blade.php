{{--
    SEO and scholarly metadata, rendered on the server from the `meta` view data
    (App\Journal\Seo\SeoMeta), so it is present with or without the SSR process.
    Every element carries data-seo: the layout's script removes them after the
    first client-side visit to another page, so a later page never inherits them.
--}}
@php
    $locale = app()->getLocale() === 'mk' ? 'mk_MK' : 'en_US';
    $alternate = $locale === 'mk_MK' ? 'en_US' : 'mk_MK';
@endphp
@if (filled($meta['description'] ?? null))
        <meta name="description" content="{{ $meta['description'] }}" data-seo>
@endif
@if (filled($meta['robots'] ?? null))
        <meta name="robots" content="{{ $meta['robots'] }}" data-seo>
@endif
@if (filled($meta['canonical'] ?? null))
        <link rel="canonical" href="{{ $meta['canonical'] }}" data-seo>
@endif
@if (! empty($meta['og']))
        <meta property="og:site_name" content="{{ \App\Journal\Seo\SeoMeta::name() }}" data-seo>
        <meta property="og:type" content="{{ $meta['og']['type'] }}" data-seo>
        <meta property="og:title" content="{{ $meta['title'] }}" data-seo>
@if (filled($meta['description'] ?? null))
        <meta property="og:description" content="{{ $meta['description'] }}" data-seo>
@endif
@if (filled($meta['canonical'] ?? null))
        <meta property="og:url" content="{{ $meta['canonical'] }}" data-seo>
@endif
        <meta property="og:locale" content="{{ $locale }}" data-seo>
        <meta property="og:locale:alternate" content="{{ $alternate }}" data-seo>
@if (filled($meta['og']['image'] ?? null))
        <meta property="og:image" content="{{ $meta['og']['image'] }}" data-seo>
@if (str_starts_with($meta['og']['image'], 'https://'))
        <meta property="og:image:secure_url" content="{{ $meta['og']['image'] }}" data-seo>
@endif
        <meta property="og:image:type" content="image/png" data-seo>
        <meta property="og:image:width" content="{{ $meta['og']['imageWidth'] }}" data-seo>
        <meta property="og:image:height" content="{{ $meta['og']['imageHeight'] }}" data-seo>
        <meta property="og:image:alt" content="{{ $meta['og']['imageAlt'] }}" data-seo>
@endif
        <meta name="twitter:card" content="summary_large_image" data-seo>
@endif
@foreach ($meta['links'] ?? [] as $link)
        <link rel="{{ $link['rel'] }}" href="{{ $link['href'] }}" data-seo>
@endforeach
@foreach ($meta['tags'] ?? [] as $tag)
@isset($tag['property'])
        <meta property="{{ $tag['property'] }}" content="{{ $tag['content'] }}" data-seo>
@else
        <meta name="{{ $tag['name'] }}" content="{{ $tag['content'] }}" data-seo>
@endisset
@endforeach
@if (! empty($meta['jsonLd']))
        <script type="application/ld+json" data-seo>{!! \App\Journal\Seo\JsonLd::encode($meta['jsonLd']) !!}</script>
@endif
