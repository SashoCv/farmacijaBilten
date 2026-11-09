<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('journal.name_en') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{!! $slot !!}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{!! $subcopy !!}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer: who publishes the journal and how to reach the editorial office. --}}
<x-slot:footer>
<x-mail::footer>
**{{ app()->getLocale() === 'mk' ? config('journal.name_mk') : config('journal.name_en') }}**<br>
{{ app()->getLocale() === 'mk' ? config('journal.publisher.name_mk') : config('journal.publisher.name_en') }} · {{ app()->getLocale() === 'mk' ? config('journal.co_publisher.name_mk') : config('journal.co_publisher.name_en') }}<br>
{{ config('journal.address.street') }}, {{ config('journal.address.postal_code') }} {{ config('journal.address.city') }} · [{{ config('journal.editorial_email') }}](mailto:{{ config('journal.editorial_email') }}) · [{{ preg_replace('#^https?://#', '', rtrim((string) config('app.url'), '/')) }}]({{ config('app.url') }})<br>
ISSN {{ config('journal.issn_print') }} (print) · {{ config('journal.issn_online') }} (online)
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
