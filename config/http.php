<?php

/*
|--------------------------------------------------------------------------
| HTTP caching and security headers
|--------------------------------------------------------------------------
|
| Read by App\Http\Middleware\PublicCache and SecurityHeaders.
|
*/

return [

    /*
    | Cache-Control for anonymous journal pages (no session, no cookie set).
    | Off by default in the local environment so developers never look at a
    | page their browser kept from five minutes ago.
    */
    'public_cache' => [
        'enabled' => (bool) env('HTTP_PUBLIC_CACHE', env('APP_ENV', 'production') !== 'local'),
        'max_age' => (int) env('HTTP_PUBLIC_CACHE_MAX_AGE', 300),
        'stale_while_revalidate' => (int) env('HTTP_PUBLIC_CACHE_SWR', 600),
    ],

    /*
    | Strict-Transport-Security max-age in seconds, sent only on HTTPS
    | requests. 0 disables the header.
    */
    'hsts_max_age' => (int) env('HTTP_HSTS_MAX_AGE', 31536000),

    /*
    | X-Frame-Options. SAMEORIGIN lets the site's own PDF viewer frame its PDFs
    | and stops other sites from framing the journal. Empty in the local
    | environment, where QA screenshots frame pages at phone width from a
    | local file.
    */
    'frame_options' => (string) env('HTTP_FRAME_OPTIONS', env('APP_ENV', 'production') === 'local' ? '' : 'SAMEORIGIN'),

    /*
    | Browser features the site never uses.
    */
    'permissions_policy' => 'accelerometer=(), browsing-topics=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',

];
