@props(['url'])
{{-- The journal's name in both languages on the navy band of the website. --}}
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block; text-decoration: none;">
<span class="header-name">{{ config('journal.name_en') }}</span><br>
<span class="header-name-alt">{{ config('journal.name_mk') }}</span>
</a>
</td>
</tr>
