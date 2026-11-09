<!DOCTYPE html>
@php
    $component = $page['component'] ?? '';
    // Light only, everywhere: the journal, the sign-in pages and the
    // manuscript system (owner's decision, 2026-11-09).
    $forceLight = true;
    $isJournal = str_starts_with($component, 'journal/');

    // SEO metadata from the controller (SeoMeta::for*()); pages without it are not indexed.
    $meta = $meta ?? \App\Journal\Seo\SeoMeta::fallback($page);

    // Server-side render, if the SSR process answers. Its head may only add the
    // <title> and page-specific extras: the SEO tags come from the partial.
    $ssr = app(\Inertia\Ssr\SsrState::class)->dispatch();
    $ssrHead = $ssr ? \App\Journal\Seo\HeadFilter::strip($ssr->head) : null;

    $nonce = \Illuminate\Support\Facades\Vite::cspNonce();
@endphp
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ! $forceLight && ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
@if ($ssrHead === null || ! str_contains($ssrHead, '<title'))
        <title>{{ $meta['documentTitle'] }}</title>
@endif
@include('partials.meta', ['meta' => $meta])

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script @if ($nonce) nonce="{{ $nonce }}" @endif>
            (function() {
                const appearance = '{{ $forceLight ? "light" : ($appearance ?? "system") }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }

                // The server-rendered SEO tags describe the page first loaded; drop
                // them once the reader moves to another page inside the app.
                const path = location.pathname;
                document.addEventListener('inertia:navigate', function (event) {
                    if (event.detail && event.detail.type !== 'initial' && location.pathname !== path) {
                        document.querySelectorAll('head [data-seo]').forEach(function (el) { el.remove(); });
                    }
                });
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="32x32">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        <link rel="manifest" href="/site.webmanifest">
        <meta name="theme-color" content="#1F3770">
@if ($isJournal)
        <link rel="alternate" type="application/atom+xml" title="{{ __('Latest articles') }} – {{ config('journal.name_en') }}" href="{{ route('feed') }}">
        <link rel="alternate" type="application/atom+xml" title="{{ __('Early online') }} – {{ config('journal.name_en') }}" href="{{ route('feed.early-online') }}">
@endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$component}.tsx"])
        {!! $ssrHead !!}
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
