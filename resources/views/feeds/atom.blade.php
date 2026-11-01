{!! '<'.'?xml version="1.0" encoding="UTF-8"?'.'>' !!}
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en">
  <id>{{ $id }}</id>
  <title>{{ $title }}</title>
  <subtitle>{{ $subtitle }}</subtitle>
  <link rel="self" type="application/atom+xml" href="{{ $self }}"/>
  <link rel="alternate" type="text/html" href="{{ $alternate }}"/>
  <updated>{{ $updated }}</updated>
  <author>
    <name>{{ $author }}</name>
  </author>
  <rights>{{ $rights }}</rights>
  <icon>{{ $icon }}</icon>
  <logo>{{ $logo }}</logo>
@foreach ($entries as $entry)
  <entry>
    <id>{{ $entry['id'] }}</id>
    <title type="text" xml:lang="{{ $entry['lang'] }}">{{ $entry['title'] }}</title>
    <link rel="alternate" type="text/html" href="{{ $entry['link'] }}"/>
@if ($entry['pdf'])
    <link rel="enclosure" type="application/pdf" href="{{ $entry['pdf'] }}"@if ($entry['pdfLength']) length="{{ $entry['pdfLength'] }}"@endif/>
@endif
@if ($entry['published'])
    <published>{{ $entry['published'] }}</published>
@endif
    <updated>{{ $entry['updatedAtom'] }}</updated>
@foreach ($entry['authors'] as $name)
    <author>
      <name>{{ $name }}</name>
    </author>
@endforeach
@if ($entry['category'])
    <category term="{{ $entry['category'] }}"/>
@endif
@if ($entry['summary'] !== '')
    <summary type="text"@if ($entry['summaryLang']) xml:lang="{{ $entry['summaryLang'] }}"@endif>{{ $entry['summary'] }}</summary>
@endif
  </entry>
@endforeach
</feed>
